import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type DraggablePillProps = {
  totalRerenders: number;
  unnecessaryPercentage: number;
  onPress: () => void;
};

function getHealthColor(percentage: number): string {
  if (percentage < 10) return '#22c55e';
  if (percentage < 30) return '#eab308';
  return '#ef4444';
}

export function DraggablePill({
  totalRerenders,
  unnecessaryPercentage,
  onPress,
}: DraggablePillProps) {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          x: (pan.x as any)._value,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    }),
  ).current;

  const healthColor = getHealthColor(unnecessaryPercentage);

  return (
    <Animated.View
      style={[styles.pill, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity onPress={onPress} style={styles.pillContent}>
        <View style={[styles.dot, { backgroundColor: healthColor }]} />
        <Text style={styles.pillText}>
          {totalRerenders} ({Math.round(unnecessaryPercentage)}%)
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 50,
    right: 16,
    zIndex: 999999,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
