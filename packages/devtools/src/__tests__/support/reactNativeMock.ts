/**
 * Stand-in for `react-native` under jest (mapped in jest.config.js). Host components
 * are plain strings, so react-test-renderer creates host fibers for them just like
 * the native renderers do.
 */
type WrapperComponentProvider = (appParameters: unknown) => unknown;
type Animation = { start: (callback?: (result: { finished: boolean }) => void) => void };

export const View = 'View';
export const Text = 'Text';
export const TextInput = 'TextInput';
export const TouchableOpacity = 'TouchableOpacity';
export const FlatList = 'FlatList';

export const StyleSheet = {
  create<T>(styles: T): T {
    return styles;
  },
  // Only absoluteFill: RN 0.88 dropped absoluteFillObject, so library code must not depend on it.
  absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  hairlineWidth: 1,
};

class AnimatedValue {
  constructor(public value: number) {}
  setOffset(): void {}
  flattenOffset(): void {}
}

class AnimatedValueXY {
  x = new AnimatedValue(0);
  y = new AnimatedValue(0);
  setOffset(): void {}
  flattenOffset(): void {}
  getTranslateTransform(): unknown[] {
    return [];
  }
}

// Animations never finish, so flashes stay mounted for the assertions.
const idleAnimation = (): Animation => ({ start: () => {} });

export const Animated = {
  View: 'Animated.View',
  Value: AnimatedValue,
  ValueXY: AnimatedValueXY,
  timing: idleAnimation,
  delay: idleAnimation,
  sequence: idleAnimation,
  event: () => () => {},
};

export const PanResponder = {
  create: () => ({ panHandlers: {} }),
};

let wrapperComponentProvider: WrapperComponentProvider | null = null;

export const AppRegistry = {
  setWrapperComponentProvider(provider: WrapperComponentProvider): void {
    wrapperComponentProvider = provider;
  },
};

/** Test-only: what AppRegistry would pass to renderApplication. */
export function __getWrapperComponentProvider(): WrapperComponentProvider | null {
  return wrapperComponentProvider;
}
