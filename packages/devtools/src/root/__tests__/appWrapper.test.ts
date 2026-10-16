import '../../core/__tests__/support/fakeDevtoolsHook';

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { ComponentType, ReactNode } from 'react';

const TEST_RENDERER_DEPRECATION = 'react-test-renderer is deprecated';

type WrapperProps = { children?: ReactNode; [prop: string]: unknown };

// The HUD runs an interval while mounted; every root is unmounted after the test.
let mountedRoots: Array<() => Promise<void>> = [];

// installAppWrapper and the layer ownership are module state: every test loads fresh copies.
async function load() {
  const React = await import('react');
  const TestRenderer = await import('react-test-renderer');
  const reactNative = await import('../../__tests__/support/reactNativeMock');
  const { installAppWrapper } = await import('../appWrapper');
  const { PerformerRoot } = await import('../PerformerRoot');
  const { showHUD } = await import('../../hud/HUDRoot');
  const { AppRegistry } = await import('react-native');
  showHUD();
  return { React, TestRenderer, reactNative, installAppWrapper, PerformerRoot, AppRegistry };
}

type Loaded = Awaited<ReturnType<typeof load>>;

function effectiveWrapper({ reactNative }: Loaded, appParameters: unknown = {}): ComponentType<WrapperProps> {
  const provider = reactNative.__getWrapperComponentProvider();
  if (!provider) throw new Error('no wrapper provider installed');
  // The mock stores the provider untyped; the library only ever returns component types.
  return provider(appParameters) as ComponentType<WrapperProps>;
}

async function renderWrapped(loaded: Loaded, Wrapper: ComponentType<WrapperProps>) {
  const { React, TestRenderer } = loaded;
  const renderer = await React.act(async () =>
    TestRenderer.create(
      React.createElement(Wrapper, { initialProps: {}, fabric: true },
        React.createElement('Text', { testID: 'app' })),
    ),
  );
  mountedRoots.push(() => React.act(async () => { renderer.unmount(); }));
  return renderer;
}

function countPills(renderer: import('react-test-renderer').ReactTestRenderer): number {
  return renderer.root.findAll(node => isHostType(node.type, 'Animated.View')).length;
}

// Host types are strings in the react-native mock but typed as components.
function isHostType(type: unknown, name: string): boolean {
  return type === name;
}

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (!String(args[0]).includes(TEST_RENDERER_DEPRECATION)) throw new Error(String(args[0]));
  });
});

afterEach(async () => {
  for (const unmount of mountedRoots) await unmount();
  mountedRoots = [];
  jest.restoreAllMocks();
});

describe('installAppWrapper', () => {
  it('installs PerformerRoot as the wrapper when the app sets none', async () => {
    const loaded = await load();
    loaded.installAppWrapper();

    expect(effectiveWrapper(loaded)).toBe(loaded.PerformerRoot);

    const renderer = await renderWrapped(loaded, effectiveWrapper(loaded));
    expect(renderer.root.findAll(node => node.props.testID === 'app')).toHaveLength(1);
    expect(countPills(renderer)).toBe(1);
  });

  it('composes with a wrapper provider the app sets afterwards', async () => {
    const loaded = await load();
    const { React, AppRegistry } = loaded;
    loaded.installAppWrapper();

    function AppWrapper({ children }: WrapperProps) {
      return React.createElement('View', { testID: 'app-wrapper' }, children);
    }
    const appProvider = jest.fn((_appParameters: unknown) => AppWrapper);
    AppRegistry.setWrapperComponentProvider(appProvider);

    const appParameters = { rootTag: 1 };
    const Wrapper = effectiveWrapper(loaded, appParameters);
    expect(appProvider).toHaveBeenCalledWith(appParameters);

    const renderer = await renderWrapped(loaded, Wrapper);
    const [appWrapper] = renderer.root.findAll(node => node.props.testID === 'app-wrapper');
    if (!appWrapper) throw new Error('app wrapper not rendered');
    expect(appWrapper.findAll(node => node.props.testID === 'app')).toHaveLength(1);
    expect(appWrapper.props.fabric).toBeUndefined();
    expect(renderer.root.findByType(AppWrapper).props).toMatchObject({ initialProps: {}, fabric: true });
    expect(countPills(renderer)).toBe(1);
  });

  it('falls back to PerformerRoot when the app provider returns nothing', async () => {
    const loaded = await load();
    loaded.installAppWrapper();
    loaded.AppRegistry.setWrapperComponentProvider(() => null as unknown as ComponentType<WrapperProps>);

    expect(effectiveWrapper(loaded)).toBe(loaded.PerformerRoot);
  });

  it('is idempotent', async () => {
    const loaded = await load();
    loaded.installAppWrapper();
    loaded.installAppWrapper();

    function AppWrapper({ children }: WrapperProps) {
      return loaded.React.createElement('View', null, children);
    }
    loaded.AppRegistry.setWrapperComponentProvider(() => AppWrapper);

    const renderer = await renderWrapped(loaded, effectiveWrapper(loaded));
    expect(renderer.root.findAllByType(loaded.PerformerRoot)).toHaveLength(1);
  });

  it('mounts one overlay and HUD even when two roots are wrapped', async () => {
    const loaded = await load();
    loaded.installAppWrapper();

    const appRoot = await renderWrapped(loaded, effectiveWrapper(loaded));
    // LogBox registers through AppRegistry too, so it gets the same wrapper.
    const logBoxRoot = await renderWrapped(loaded, effectiveWrapper(loaded));

    expect(countPills(appRoot)).toBe(1);
    expect(countPills(logBoxRoot)).toBe(0);

    const unmountAppRoot = mountedRoots.shift();
    if (!unmountAppRoot) throw new Error('app root not tracked');
    await unmountAppRoot();
    expect(countPills(logBoxRoot)).toBe(1);
  });
});
