export type MeasuredRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FlashData = {
  id: string;
  rect: MeasuredRect;
  renderCount: number;
  isUnnecessary: boolean;
  componentName: string;
  reason: string;
};
