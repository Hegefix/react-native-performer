import React, { type ComponentType, type ReactNode } from 'react';
import { AppRegistry } from 'react-native';
import { PerformerRoot } from './PerformerRoot';
import { markOwnWrapper } from '../analysis/ownFibers';

type WrapperProps = {
  children?: ReactNode;
  [prop: string]: unknown;
};

type WrapperComponentProvider = Parameters<typeof AppRegistry.setWrapperComponentProvider>[0];
type AppParameters = Parameters<WrapperComponentProvider>[0];

const composedWrappers = new WeakMap<ComponentType<WrapperProps>, ComponentType<WrapperProps>>();
let installed = false;

/**
 * Mounts <PerformerRoot> around every app registered through AppRegistry.
 * AppRegistry keeps the provider in a module variable with no getter, so a provider
 * the app sets later is composed by intercepting the setter; one set before this
 * runs cannot be read, which is why `auto` must be the first import.
 */
export function installAppWrapper(): void {
  if (!__DEV__ || installed) return;
  installed = true;

  const setProvider = AppRegistry.setWrapperComponentProvider;

  const composeProvider =
    (appProvider: WrapperComponentProvider | null): WrapperComponentProvider =>
    (appParameters: AppParameters) => {
      const AppWrapper: ComponentType<WrapperProps> | null | undefined = appProvider?.(appParameters);
      return AppWrapper ? composeWrapper(AppWrapper) : PerformerRoot;
    };

  setProvider.call(AppRegistry, composeProvider(null));

  // The RN typings declare AppRegistry as a namespace, whose functions TS refuses to reassign.
  Object.defineProperty(AppRegistry, 'setWrapperComponentProvider', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: (provider: WrapperComponentProvider) => {
      setProvider.call(AppRegistry, composeProvider(provider));
    },
  });
}

function composeWrapper(AppWrapper: ComponentType<WrapperProps>): ComponentType<WrapperProps> {
  const cached = composedWrappers.get(AppWrapper);
  if (cached) return cached;

  function PerformerComposedWrapper({ children, ...wrapperProps }: WrapperProps) {
    return (
      <PerformerRoot>
        <AppWrapper {...wrapperProps}>{children}</AppWrapper>
      </PerformerRoot>
    );
  }
  markOwnWrapper(PerformerComposedWrapper);
  composedWrappers.set(AppWrapper, PerformerComposedWrapper);
  return PerformerComposedWrapper;
}
