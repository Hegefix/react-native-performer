import { attachHook } from './core/attachHook';
import { enableOverlay } from './overlay/overlayApi';
import { showHUD } from './hud/HUDRoot';

if (__DEV__) {
  attachHook();
  enableOverlay();
  showHUD();
}

export {};
