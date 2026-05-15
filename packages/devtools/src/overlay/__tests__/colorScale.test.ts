import { describe, it, expect } from '@jest/globals';
import { getFlashColor, getFlashStyle } from '../colorScale';

describe('getFlashColor', () => {
  describe('default palette', () => {
    it('returns blue for 1-2 renders', () => {
      expect(getFlashColor(1, 'default')).toBe('rgba(59, 130, 246, 0.3)');
      expect(getFlashColor(2, 'default')).toBe('rgba(59, 130, 246, 0.3)');
    });

    it('returns yellow for 3-5 renders', () => {
      expect(getFlashColor(3, 'default')).toBe('rgba(234, 179, 8, 0.3)');
      expect(getFlashColor(5, 'default')).toBe('rgba(234, 179, 8, 0.3)');
    });

    it('returns red for 6+ renders', () => {
      expect(getFlashColor(6, 'default')).toBe('rgba(239, 68, 68, 0.3)');
      expect(getFlashColor(100, 'default')).toBe('rgba(239, 68, 68, 0.3)');
    });
  });

  describe('colorblind palette', () => {
    it('returns distinct colors from default palette', () => {
      const defaultLow = getFlashColor(1, 'default');
      const colorblindLow = getFlashColor(1, 'colorblind');
      expect(colorblindLow).not.toBe(defaultLow);
    });

    it('returns three distinct severity levels', () => {
      const low = getFlashColor(1, 'colorblind');
      const mid = getFlashColor(3, 'colorblind');
      const high = getFlashColor(6, 'colorblind');
      expect(new Set([low, mid, high]).size).toBe(3);
    });
  });
});

describe('getFlashStyle', () => {
  it('returns dashed border for unnecessary rerenders', () => {
    const style = getFlashStyle(1, true, 'default', 0.3);
    expect(style.borderStyle).toBe('dashed');
  });

  it('returns solid border for necessary rerenders', () => {
    const style = getFlashStyle(1, false, 'default', 0.3);
    expect(style.borderStyle).toBe('solid');
  });

  it('respects custom opacity', () => {
    const style = getFlashStyle(6, false, 'default', 0.5);
    expect(style.backgroundColor).toContain('0.5)');
  });
});
