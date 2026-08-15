export type ThemeName = 'aubergine' | 'nocturne' | 'ocin' | 'banana' | 'custom';

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  sidebarBg: string;
  sidebarText: string;
  sidebarTextActive: string;
  sidebarHover: string;
  activeItemBg: string;
  accentColor: string;
  railBg: string;
  canvasBg: string;
  canvasText: string;
}

export const PRESET_THEMES: Record<Exclude<ThemeName, 'custom'>, ThemeConfig> = {
  aubergine: {
    name: 'aubergine',
    label: 'Aubergine (Classic)',
    sidebarBg: '#3F0E40',
    sidebarText: '#BCABB6',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: '#350d36',
    activeItemBg: '#1164A3',
    accentColor: '#007A5A',
    railBg: '#19171D',
    canvasBg: '#FFFFFF',
    canvasText: '#1D1C1D',
  },
  nocturne: {
    name: 'nocturne',
    label: 'Nocturne (Dark Graphite)',
    sidebarBg: '#1A1D21',
    sidebarText: '#D1D2D3',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: '#222529',
    activeItemBg: '#2C3136',
    accentColor: '#1D9BD1',
    railBg: '#121417',
    canvasBg: '#1A1D21',
    canvasText: '#D1D2D3',
  },
  ocin: {
    name: 'ocin',
    label: 'Ocin (Deep Ocean Blue)',
    sidebarBg: '#1A365D',
    sidebarText: '#CBD5E1',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: '#1E293B',
    activeItemBg: '#2B6CB0',
    accentColor: '#63B3ED',
    railBg: '#0F172A',
    canvasBg: '#FFFFFF',
    canvasText: '#1D1C1D',
  },
  banana: {
    name: 'banana',
    label: 'Banana (Warm Yellow)',
    sidebarBg: '#F6C445',
    sidebarText: '#4A3414',
    sidebarTextActive: '#1A1102',
    sidebarHover: '#EBB432',
    activeItemBg: '#DFA31E',
    accentColor: '#1264A3',
    railBg: '#2C1A04',
    canvasBg: '#FFFDF5',
    canvasText: '#2C1A04',
  },
};

export const applyThemeToDom = (theme: ThemeConfig) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.style.setProperty('--theme-sidebar-bg', theme.sidebarBg);
  root.style.setProperty('--theme-sidebar-text', theme.sidebarText);
  root.style.setProperty('--theme-sidebar-text-active', theme.sidebarTextActive);
  root.style.setProperty('--theme-sidebar-hover', theme.sidebarHover);
  root.style.setProperty('--theme-active-item-bg', theme.activeItemBg);
  root.style.setProperty('--theme-accent-color', theme.accentColor);
  root.style.setProperty('--theme-rail-bg', theme.railBg);
  root.style.setProperty('--theme-canvas-bg', theme.canvasBg);
  root.style.setProperty('--theme-canvas-text', theme.canvasText);
};

export const getThemeConfig = (
  themeName: ThemeName,
  customTheme?: Partial<ThemeConfig>
): ThemeConfig => {
  if (themeName === 'custom' && customTheme) {
    const base = PRESET_THEMES.aubergine;
    return {
      name: 'custom',
      label: 'Custom Theme',
      sidebarBg: customTheme.sidebarBg || base.sidebarBg,
      sidebarText: customTheme.sidebarText || base.sidebarText,
      sidebarTextActive: customTheme.sidebarTextActive || '#FFFFFF',
      sidebarHover: customTheme.sidebarHover || '#350d36',
      activeItemBg: customTheme.activeItemBg || base.activeItemBg,
      accentColor: customTheme.accentColor || base.accentColor,
      railBg: customTheme.railBg || base.railBg,
      canvasBg: customTheme.canvasBg || '#FFFFFF',
      canvasText: customTheme.canvasText || '#1D1C1D',
    };
  }

  return PRESET_THEMES[themeName as keyof typeof PRESET_THEMES] || PRESET_THEMES.aubergine;
};
