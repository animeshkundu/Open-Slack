export type ThemeName =
  | 'aubergine'
  | 'nocturne'
  | 'ocin'
  | 'banana'
  | 'forest'
  | 'monument'
  | 'custom';

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
    sidebarBg: '#4A154B',
    sidebarText: '#BCABB6',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: '#3F0E40',
    activeItemBg: '#1164A3',
    accentColor: '#ECB22E',
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
    activeItemBg: '#1264A3',
    accentColor: '#E01E5A',
    railBg: '#121417',
    canvasBg: '#1A1D21',
    canvasText: '#D1D2D3',
  },
  ocin: {
    name: 'ocin',
    label: 'Ocin (Deep Ocean Blue)',
    sidebarBg: '#19212D',
    sidebarText: '#CBD5E1',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: '#131B24',
    activeItemBg: '#2D9CDB',
    accentColor: '#F2994A',
    railBg: '#0F172A',
    canvasBg: '#FFFFFF',
    canvasText: '#1D1C1D',
  },
  banana: {
    name: 'banana',
    label: 'Banana (Warm Yellow)',
    sidebarBg: '#F8E71C',
    sidebarText: '#4A3414',
    sidebarTextActive: '#000000',
    sidebarHover: '#EBB432',
    activeItemBg: '#4A90E2',
    accentColor: '#D0021B',
    railBg: '#2C1A04',
    canvasBg: '#FFFDF5',
    canvasText: '#2C1A04',
  },
  forest: {
    name: 'forest',
    label: 'Forest (Evergreen)',
    sidebarBg: '#1E3A2F',
    sidebarText: '#A3C9B8',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: '#152921',
    activeItemBg: '#27AE60',
    accentColor: '#F2C94C',
    railBg: '#11221B',
    canvasBg: '#FFFFFF',
    canvasText: '#1D1C1D',
  },
  monument: {
    name: 'monument',
    label: 'Monument (Slate & Crimson)',
    sidebarBg: '#2B2D42',
    sidebarText: '#8D99AE',
    sidebarTextActive: '#EDF2F4',
    sidebarHover: '#202232',
    activeItemBg: '#8D99AE',
    accentColor: '#EF233C',
    railBg: '#1C1D2B',
    canvasBg: '#FFFFFF',
    canvasText: '#2B2D42',
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
