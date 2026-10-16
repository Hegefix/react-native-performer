import { attachHook } from './core/attachHook';
import { enableOverlay } from './overlay/overlayApi';
import { showHUD } from './hud/HUDRoot';
import { installAppWrapper } from './root/appWrapper';

if (__DEV__) {
  attachHook();
  enableOverlay();
  showHUD();
  installAppWrapper();
}

export {};
