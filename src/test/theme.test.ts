import { describe, expect, it, beforeEach } from 'vitest';
import {
  applyThemeToDom,
  getThemeConfig,
  PRESET_THEMES,
  ThemeConfig,
} from '../lib/theme';

describe('Theme configuration', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('provides complete, distinct preset palettes', () => {
    const requiredKeys: (keyof ThemeConfig)[] = [
      'sidebarBg',
      'sidebarText',
      'sidebarTextActive',
      'sidebarHover',
      'activeItemBg',
      'accentColor',
      'railBg',
      'canvasBg',
      'canvasText',
    ];

    Object.values(PRESET_THEMES).forEach((theme) => {
      expect(theme.name).not.toBe('custom');
      requiredKeys.forEach((key) => expect(theme[key]).toMatch(/^#[0-9A-F]{6}$/i));
    });

    expect(new Set(Object.values(PRESET_THEMES).map((theme) => theme.name)).size).toBe(
      Object.keys(PRESET_THEMES).length
    );
  });

  it('merges custom values with safe aubergine defaults', () => {
    expect(getThemeConfig('custom', { accentColor: '#123456' })).toMatchObject({
      name: 'custom',
      label: 'Custom Theme',
      accentColor: '#123456',
      sidebarBg: PRESET_THEMES.aubergine.sidebarBg,
      canvasBg: '#FFFFFF',
    });
  });

  it('falls back to aubergine for an unknown theme name', () => {
    expect(getThemeConfig('not-a-theme' as never)).toBe(PRESET_THEMES.aubergine);
  });

  it('applies all palette values as document CSS variables', () => {
    const theme = PRESET_THEMES.nocturne;

    applyThemeToDom(theme);

    expect(document.documentElement.style.getPropertyValue('--theme-sidebar-bg')).toBe(
      theme.sidebarBg
    );
    expect(document.documentElement.style.getPropertyValue('--theme-accent-color')).toBe(
      theme.accentColor
    );
    expect(document.documentElement.style.getPropertyValue('--theme-canvas-text')).toBe(
      theme.canvasText
    );
  });
});
