import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashRect } from './FlashRect';
import { onRerender } from '../core/eventBus';
import type { FlashData } from './types';
import type { OverlayOptions, RerenderEvent } from '../core/types';

type OverlayContainerProps = {
  options: Required<OverlayOptions>;
};

let idCounter = 0;

export function OverlayContainer({ options }: OverlayContainerProps) {
  const [flashes, setFlashes] = useState<FlashData[]>([]);
  const pendingRef = useRef<Map<number, RerenderEvent[]>>(new Map());
  const rafRef = useRef<number | null>(null);

  const processCommitBatch = useCallback((events: RerenderEvent[]) => {
    const flashBatch: FlashData[] = [];

    for (const event of events) {
      if (options.showUnnecessaryOnly && !event.isUnnecessary) continue;

      const severityThreshold =
        options.minSeverity === 'critical' ? 6 :
        options.minSeverity === 'warning' ? 3 : 1;

      if (event.renderCount < severityThreshold) continue;

      const flash: FlashData = {
        id: `flash-${++idCounter}`,
        rect: { x: 0, y: 0, width: 0, height: 0 },
        renderCount: event.renderCount,
        isUnnecessary: event.isUnnecessary,
        componentName: event.component.name,
        reason: event.reason.type,
      };
      flashBatch.push(flash);
    }

    if (flashBatch.length > 0) {
      setFlashes(prev => [...prev, ...flashBatch]);
    }
  }, [options.showUnnecessaryOnly, options.minSeverity]);

  useEffect(() => {
    if (!options.enabled) return;

    const unsubscribe = onRerender((event) => {
      const commitId = event.commitId;
      const pending = pendingRef.current;

      if (!pending.has(commitId)) {
        pending.set(commitId, []);

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
          const batch = pending.get(commitId);
          pending.delete(commitId);
          rafRef.current = null;
          if (batch) processCommitBatch(batch);
        });
      }

      pending.get(commitId)!.push(event);
    });

    return () => {
      unsubscribe();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [options.enabled, processCommitBatch]);

  const handleFlashComplete = useCallback((id: string) => {
    setFlashes(prev => prev.filter(f => f.id !== id));
  }, []);

  if (!options.enabled) return null;

  return (
    <View style={styles.container} pointerEvents="none">
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

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
  },
});
