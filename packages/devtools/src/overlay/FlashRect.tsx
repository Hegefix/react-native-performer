import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import type { FlashData } from './types';
import { getFlashStyle } from './colorScale';
import type { OverlayOptions } from '../core/types';

type FlashRectProps = {
  flash: FlashData;
  palette: NonNullable<OverlayOptions['colorScale']>;
  opacity: number;
  onComplete: (id: string) => void;
};

const FADE_IN = 50;
const HOLD = 200;
const FADE_OUT = 300;

export function FlashRect({ flash, palette, opacity, onComplete }: FlashRectProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 1,
        duration: FADE_IN,
        useNativeDriver: true,
      }),
      Animated.delay(HOLD),
      Animated.timing(animValue, {
        toValue: 0,
        duration: FADE_OUT,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete(flash.id);
    });
  }, [animValue, flash.id, onComplete]);

  const style = getFlashStyle(flash.renderCount, flash.isUnnecessary, palette, opacity);

  return (
    <Animated.View
      style={[
        styles.flash,
        {
          left: flash.rect.x,
          top: flash.rect.y,
          width: flash.rect.width,
          height: flash.rect.height,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          borderStyle: style.borderStyle,
          opacity: animValue,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  flash: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 2,
  },
});
