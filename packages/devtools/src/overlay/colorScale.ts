type Palette = 'default' | 'colorblind';

type FlashStyle = {
  backgroundColor: string;
  borderColor: string;
  borderStyle: 'solid' | 'dashed';
};

const PALETTES = {
  default: {
    low: { r: 59, g: 130, b: 246 },
    mid: { r: 234, g: 179, b: 8 },
    high: { r: 239, g: 68, b: 68 },
  },
  colorblind: {
    low: { r: 0, g: 114, b: 178 },
    mid: { r: 230, g: 159, b: 0 },
    high: { r: 204, g: 0, b: 0 },
  },
} as const;

function getSeverity(renderCount: number): 'low' | 'mid' | 'high' {
  if (renderCount <= 2) return 'low';
  if (renderCount <= 5) return 'mid';
  return 'high';
}

export function getFlashColor(renderCount: number, palette: Palette): string {
  const severity = getSeverity(renderCount);
  const { r, g, b } = PALETTES[palette][severity];
  return `rgba(${r}, ${g}, ${b}, 0.3)`;
}

export function getFlashStyle(
  renderCount: number,
  isUnnecessary: boolean,
  palette: Palette,
  opacity: number,
): FlashStyle {
  const severity = getSeverity(renderCount);
  const { r, g, b } = PALETTES[palette][severity];
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
    borderColor: `rgba(${r}, ${g}, ${b}, ${Math.min(opacity + 0.3, 1)})`,
    borderStyle: isUnnecessary ? 'dashed' : 'solid',
  };
}
