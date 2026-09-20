export type ThemeName = 'liquid-glass' | 'deep-space';

export interface Theme {
  name: ThemeName;
  displayName: string;

  // Page & backdrop
  pageBackground: string;
  backdropElements: 'aurora' | 'starfield';

  // Glass surfaces
  glassBase: string;
  glassElevated: string;
  glassStrong: string;
  glassBorder: string;
  glassBorderStrong: string;
  glassShadow: string;
  glassShadowStrong: string;

  // Solid surfaces
  surface: string;
  surfaceAlt: string;
  surfaceOverlay: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Accents
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentGradient: string;

  // Semantic
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;

  // Separators & lines
  separator: string;
  separatorStrong: string;

  // Radii
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  radiusPill: string;

  // Motion
  spring: string;
  ease: string;

  // Fonts
  fontSans: string;
  fontMono: string;
}

export const liquidGlass: Theme = {
  name: 'liquid-glass',
  displayName: 'Liquid Glass',

  pageBackground:
    'linear-gradient(180deg, #F0F4FE 0%, #ECEEFB 45%, #F3ECF9 100%)',
  backdropElements: 'aurora',

  glassBase: 'rgba(255, 255, 255, 0.55)',
  glassElevated: 'rgba(255, 255, 255, 0.72)',
  glassStrong: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.7)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.9)',
  glassShadow: '0 2px 8px rgba(31, 38, 71, 0.05)',
  glassShadowStrong: '0 8px 24px rgba(31, 38, 71, 0.08)',

  surface: 'rgba(255, 255, 255, 0.65)',
  surfaceAlt: 'rgba(255, 255, 255, 0.45)',
  surfaceOverlay: 'rgba(255, 255, 255, 0.85)',

  // Darkened for better contrast on light glass surfaces
  textPrimary: '#14161A',
  textSecondary: 'rgba(38, 42, 51, 0.82)',
  textTertiary: 'rgba(38, 42, 51, 0.58)',
  textInverse: '#FFFFFF',

  separator: 'rgba(60, 60, 67, 0.10)',
  separatorStrong: 'rgba(60, 60, 67, 0.18)',

  accent: '#0A84FF',
  accentHover: '#0066D6',
  accentSoft: 'rgba(10, 132, 255, 0.12)',
  accentGradient: 'linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)',

  success: '#218838',
  successSoft: 'rgba(48, 179, 80, 0.14)',
  warning: '#B26A00',
  warningSoft: 'rgba(224, 134, 0, 0.14)',
  danger: '#C8231A',
  dangerSoft: 'rgba(229, 52, 43, 0.14)',

  radiusSm: '10px',
  radiusMd: '14px',
  radiusLg: '20px',
  radiusXl: '24px',
  radiusPill: '999px',

  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',

  fontSans:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif',
  fontMono:
    'ui-monospace, "SF Mono", Monaco, Consolas, "Liberation Mono", monospace',
};

export const deepSpace: Theme = {
  name: 'deep-space',
  displayName: 'Deep Space',

  pageBackground: '#0A1128',
  backdropElements: 'starfield',

  glassBase: 'rgba(30, 41, 59, 0.9)',
  glassElevated: 'rgba(30, 41, 59, 0.95)',
  glassStrong: 'rgba(15, 23, 42, 0.95)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.15)',
  glassShadow: '0 8px 32px rgba(31, 38, 135, 0.10)',
  glassShadowStrong:
    '0 20px 60px rgba(31, 38, 135, 0.14), 0 2px 8px rgba(31, 38, 135, 0.06)',

  surface: '#1E293B',
  surfaceAlt: '#0F172A',
  surfaceOverlay: '#0F172A',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#0F172A',

  accent: '#6366F1',
  accentHover: '#4F46E5',
  accentSoft: 'rgba(99, 102, 241, 0.12)',
  accentGradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',

  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.1)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.1)',
  danger: '#F87171',
  dangerSoft: 'rgba(239, 68, 68, 0.1)',

  separator: 'rgba(255, 255, 255, 0.06)',
  separatorStrong: 'rgba(255, 255, 255, 0.12)',

  radiusSm: '8px',
  radiusMd: '12px',
  radiusLg: '16px',
  radiusXl: '20px',
  radiusPill: '999px',

  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',

  fontSans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontMono: 'ui-monospace, Consolas, monospace',
};

export const themes: Record<ThemeName, Theme> = {
  'liquid-glass': liquidGlass,
  'deep-space': deepSpace,
};

export const DEFAULT_THEME: ThemeName = 'liquid-glass';
