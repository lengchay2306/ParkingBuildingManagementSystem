import { Fonts } from '@/constants/theme';

export const DesignColors = {
  primary: '#6366F1',
  onPrimary: '#ffffff',
  primaryHover: '#818CF8',
  primaryFocus: '#4F46E5',
  ink: '#F1F5F9',
  inkMuted: '#94A3B8',
  inkSubtle: '#64748B',
  inkTertiary: '#475569',
  canvas: '#0B0F19',
  surface1: '#1E2530',
  surface2: '#1F293D',
  surface3: '#252F42',
  surface4: '#2A3548',
  hairline: 'rgba(255,255,255,0.05)',
  hairlineStrong: 'rgba(255,255,255,0.10)',
  hairlineTertiary: 'rgba(255,255,255,0.14)',
  semanticSuccess: '#10B981',
  semanticWarning: '#F59E0B',
  accentSky: '#60A5FA',
  accentEmerald: '#10B981',
  accentAmber: '#F59E0B',
  accentViolet: '#8B5CF6',
  accentBlue: '#3B82F6',
  placeholder: '#64748B',
  glowEmerald: 'rgba(16,185,129,0.22)',
  glowViolet: 'rgba(139,92,246,0.35)',
  semanticOverlay: '#000000',
} as const;

export const DesignColorsLight = {
  primary: '#5e6ad2',
  onPrimary: '#ffffff',
  primaryHover: '#4a56bb',
  primaryFocus: '#5e69d1',
  ink: '#101318',
  inkMuted: '#202734',
  inkSubtle: '#374151',
  inkTertiary: '#4b5563',
  canvas: '#ffffff',
  surface1: '#f7f8fb',
  surface2: '#f1f4f8',
  surface3: '#e8edf3',
  surface4: '#dde5ef',
  hairline: '#9aa7ba',
  hairlineStrong: '#7f90a7',
  hairlineTertiary: '#6f8199',
  semanticSuccess: '#059669',
  semanticWarning: '#D97706',
  accentSky: '#2563EB',
  accentEmerald: '#059669',
  accentAmber: '#D97706',
  accentViolet: '#7C3AED',
  accentBlue: '#2563EB',
  placeholder: '#9CA3AF',
  glowEmerald: 'rgba(5,150,105,0.15)',
  glowViolet: 'rgba(124,58,237,0.15)',
  semanticOverlay: '#000000',
} as const;

export type DesignColorPalette = {
  readonly [K in keyof typeof DesignColors]: string;
};

export const Radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  pill: 9999,
  full: 9999,
} as const;

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 24,
} as const;

const TypeScale = 0.82;
const scaleType = (value: number) => Math.round(value * TypeScale);
const scaleLine = (value: number, multiplier: number) => Math.round(scaleType(value) * multiplier);

export const Typography = {
  displayMd: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(40),
    fontWeight: 600,
    lineHeight: scaleLine(40, 1.15),
    letterSpacing: -1,
  },
  headline: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(28),
    fontWeight: 600,
    lineHeight: scaleLine(28, 1.2),
    letterSpacing: -0.6,
  },
  cardTitle: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(22),
    fontWeight: 500,
    lineHeight: scaleLine(22, 1.25),
    letterSpacing: -0.4,
  },
  pageTitle: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(24),
    fontWeight: '600',
    lineHeight: scaleLine(24, 1.25),
    letterSpacing: -0.5,
  },
  metricValue: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(28),
    fontWeight: '700',
    lineHeight: scaleLine(28, 1.1),
    letterSpacing: -0.8,
  },
  subhead: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(20),
    fontWeight: 400,
    lineHeight: scaleLine(20, 1.4),
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(16),
    fontWeight: 400,
    lineHeight: scaleLine(16, 1.5),
    letterSpacing: -0.05,
  },
  bodySm: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(14),
    fontWeight: 400,
    lineHeight: scaleLine(14, 1.5),
    letterSpacing: 0,
  },
  caption: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(12),
    fontWeight: 400,
    lineHeight: scaleLine(12, 1.4),
    letterSpacing: 0,
  },
  button: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(14),
    fontWeight: 500,
    lineHeight: scaleLine(14, 1.2),
    letterSpacing: 0,
  },
  eyebrow: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(13),
    fontWeight: 500,
    lineHeight: scaleLine(13, 1.3),
    letterSpacing: 0.4,
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: scaleType(13),
    fontWeight: 400,
    lineHeight: scaleLine(13, 1.5),
    letterSpacing: 0,
  },
} as const;

export const TypeUtils = {
  scaleType,
} as const;
