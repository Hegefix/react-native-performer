import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashRect } from './FlashRect';
import { measureFiber } from './measure';
import { onRerenderWithFiber } from '../core/eventBus';
import type { Fiber } from '../core/fiber';
import type { FlashData, MeasuredRect } from './types';
import type { OverlayOptions, RerenderEvent } from '../core/types';

type OverlayContainerProps = {
  options: Required<OverlayOptions>;
};

type PendingRender = {
  event: RerenderEvent;
  fiber: Fiber;
};

/** Minimum gap between flushes, so a hot render loop costs at most ~10 measure batches a second. */
export const FLUSH_INTERVAL_MS = 100;
export const MAX_FLASHES_PER_FLUSH = 40;
export const MAX_ACTIVE_FLASHES = 120;

let idCounter = 0;

export function OverlayContainer({ options }: OverlayContainerProps) {
  const [flashes, setFlashes] = useState<FlashData[]>([]);
  const containerRef = useRef<View>(null);
  // measureInWindow is window-relative; the overlay is not guaranteed to start at the window origin.
  const originRef = useRef({ x: 0, y: 0 });

  const { enabled, showUnnecessaryOnly, minSeverity } = options;

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    // Keyed by fiber so a component rendering several times between flushes flashes once, with its latest count.
    const pending = new Map<Fiber, PendingRender>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let frame: number | null = null;
    let lastFlushAt = 0;

    const severityThreshold =
      minSeverity === 'critical' ? 6 :
      minSeverity === 'warning' ? 3 : 1;

    const flush = (): void => {
      frame = null;
      lastFlushAt = Date.now();
      const batch = Array.from(pending.values());
      pending.clear();

      void Promise.all(
        batch.map(async ({ event, fiber }) =>
          toFlash(event, await measureFiber(fiber), originRef.current),
        ),
      ).then(results => {
        if (disposed) return;
        const ready = results.filter((flash): flash is FlashData => flash !== null);
        if (ready.length === 0) return;
        setFlashes(prev => [...prev, ...ready].slice(-MAX_ACTIVE_FLASHES));
      });
    };

    const scheduleFlush = (): void => {
      if (timer !== null || frame !== null) return;
      const wait = Math.max(0, lastFlushAt + FLUSH_INTERVAL_MS - Date.now());
      timer = setTimeout(() => {
        timer = null;
        // Measure on the next frame, after the native side has mounted the commit.
        frame = requestAnimationFrame(flush);
      }, wait);
    };

    const unsubscribe = onRerenderWithFiber((event, fiber) => {
      if (showUnnecessaryOnly && !event.isUnnecessary) return;
      if (event.renderCount < severityThreshold) return;

      const key = fiber.alternate !== null && pending.has(fiber.alternate) ? fiber.alternate : fiber;
      if (!pending.has(key) && pending.size >= MAX_FLASHES_PER_FLUSH) return;

      pending.set(key, { event, fiber });
      scheduleFlush();
    });

    return () => {
      disposed = true;
      unsubscribe();
      if (timer !== null) clearTimeout(timer);
      if (frame !== null) cancelAnimationFrame(frame);
      pending.clear();
      setFlashes(prev => (prev.length === 0 ? prev : []));
    };
  }, [enabled, showUnnecessaryOnly, minSeverity]);

  const handleFlashComplete = useCallback((id: string) => {
    setFlashes(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleLayout = useCallback(() => {
    containerRef.current?.measureInWindow((x, y) => {
      originRef.current = { x, y };
    });
  }, []);

  if (!enabled) return null;

  return (
    <View ref={containerRef} style={styles.container} pointerEvents="none" onLayout={handleLayout}>
      {flashes.map(flash => (
        <FlashRect
          key={flash.id}
          flash={flash}
          palette={options.colorScale}
          opacity={options.opacity}
          onComplete={handleFlashComplete}
        />
      ))}
    </View>
  );
}

function toFlash(
  event: RerenderEvent,
  rect: MeasuredRect | null,
  origin: { x: number; y: number },
): FlashData | null {
  if (!rect) return null;
  return {
    id: `flash-${++idCounter}`,
    rect: { ...rect, x: rect.x - origin.x, y: rect.y - origin.y },
    renderCount: event.renderCount,
    isUnnecessary: event.isUnnecessary,
    componentName: event.component.name,
    reason: event.reason.type,
  };
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
  },
});
