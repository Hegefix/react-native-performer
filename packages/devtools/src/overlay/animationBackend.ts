import { Animated as RNAnimated } from 'react-native';

type AnimationBackend = {
  type: 'reanimated' | 'rn-animated';
  Animated: typeof RNAnimated;
};

let cachedBackend: AnimationBackend | null = null;

export function getAnimationBackend(): AnimationBackend {
  if (cachedBackend) return cachedBackend;

  try {
    const reanimated = require('react-native-reanimated');
    if (reanimated?.default) {
      cachedBackend = {
        type: 'reanimated',
        Animated: reanimated.default,
      };
      return cachedBackend;
    }
  } catch {
    // Reanimated not installed
  }

  cachedBackend = {
    type: 'rn-animated',
    Animated: RNAnimated,
  };
  return cachedBackend;
}

export function resetBackendCache(): void {
  cachedBackend = null;
}
