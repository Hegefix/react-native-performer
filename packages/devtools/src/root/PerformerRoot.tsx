import React, { useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { OverlayContainer } from '../overlay/OverlayContainer';
import { getOverlayState, subscribeOverlay } from '../overlay/overlayApi';
import { HUDApp } from '../hud/HUDRoot';
import { markOwnSubtree, markOwnWrapper } from '../analysis/ownFibers';

type PerformerRootProps = {
  children?: ReactNode;
};

/**
 * Renders the flash overlay and HUD above `children`. `import '@performer/devtools/auto'`
 * mounts it for you; use it directly only when the AppRegistry wrapper is not an option.
 */
export function PerformerRoot({ children }: PerformerRootProps) {
  return (
    <>
      {children}
      {__DEV__ ? <PerformerLayer /> : null}
    </>
  );
}
markOwnWrapper(PerformerRoot);

function PerformerLayer() {
  const isOwner = useLayerOwnership();
  if (!isOwner) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <OverlayHost />
      <HUDApp />
    </View>
  );
}
markOwnSubtree(PerformerLayer);

function OverlayHost() {
  const options = useSyncExternalStore(subscribeOverlay, getOverlayOptions);
  return <OverlayContainer options={options} />;
}

function getOverlayOptions() {
  return getOverlayState().options;
}

// The wrapper provider applies to every AppRegistry root (LogBox included), and a manual
// <PerformerRoot> can coexist with `auto`. The overlay and HUD hold global state, so one layer wins.
let ownerToken: object | null = null;
const ownerListeners = new Set<() => void>();

function subscribeOwner(listener: () => void): () => void {
  ownerListeners.add(listener);
  return () => { ownerListeners.delete(listener); };
}

function getOwnerToken(): object | null {
  return ownerToken;
}

function setOwnerToken(token: object | null): void {
  ownerToken = token;
  for (const listener of Array.from(ownerListeners)) listener();
}

function useLayerOwnership(): boolean {
  const [token] = useState(() => ({}));
  const owner = useSyncExternalStore(subscribeOwner, getOwnerToken);

  useLayoutEffect(() => () => {
    if (ownerToken === token) setOwnerToken(null);
  }, [token]);

  useLayoutEffect(() => {
    // Read the module value, not `owner`: two layers mounting in one commit both see a stale null.
    if (ownerToken === null) setOwnerToken(token);
  }, [owner, token]);

  return owner === token;
}
