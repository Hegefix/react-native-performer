import React from 'react';
import { HUDContainer } from './HUDContainer';
import type { HUDOptions } from '../core/types';

const DEFAULT_HUD_OPTIONS: Required<HUDOptions> = {
  position: 'bottom-right',
  defaultTab: 'offenders',
  updateInterval: 500,
  maxCommits: 1000,
  enabled: false,
};

let currentOptions: Required<HUDOptions> = { ...DEFAULT_HUD_OPTIONS };
let setOptionsCallback: ((opts: Required<HUDOptions>) => void) | null = null;

export function HUDApp() {
  const [options, setOptions] = React.useState<Required<HUDOptions>>(currentOptions);

  React.useEffect(() => {
    setOptionsCallback = setOptions;
    return () => { setOptionsCallback = null; };
  }, []);

  return <HUDContainer options={options} />;
}

export function showHUD(options: HUDOptions = {}): void {
  currentOptions = {
    ...DEFAULT_HUD_OPTIONS,
    ...options,
    enabled: true,
  };

  if (setOptionsCallback) {
    setOptionsCallback(currentOptions);
  }
}

export function hideHUD(): void {
  currentOptions = { ...currentOptions, enabled: false };
  if (setOptionsCallback) {
    setOptionsCallback(currentOptions);
  }
}
