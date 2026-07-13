import { Fonts } from '@/constants/theme';

export const DesignColors = {
  primary: '#5e6ad2',
  onPrimary: '#ffffff',
  primaryHover: '#828fff',
  primaryFocus: '#5e69d1',
  ink: '#f7f8f8',
  inkMuted: '#d0d6e0',
  inkSubtle: '#8a8f98',
  inkTertiary: '#62666d',
  canvas: '#010102',
  surface1: '#0f1011',
  surface2: '#141516',
  surface3: '#18191a',
  surface4: '#191a1b',
  hairline: '#23252a',
  hairlineStrong: '#34343a',
  hairlineTertiary: '#3e3e44',
  semanticSuccess: '#34D399',
  semanticWarning: '#FB923C',
  semanticDanger: '#F87171',
  accentSky: '#60A5FA',
  accentEmerald: '#00E676',
  neonSuccess: '#00E676',
  accentAmber: '#FB923C',
  accentViolet: '#5e6ad2',
  accentBlue: '#818CF8',
  placeholder: '#8a8f98',
  glowEmerald: 'rgba(52,211,153,0.25)',
  glowViolet: 'rgba(94,106,210,0.35)',
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
  semanticDanger: '#DC2626',
  accentSky: '#2563EB',
  accentEmerald: '#059669',
  neonSuccess: '#059669',
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

/** Staff light theme — soft canvas, elevated cards (Linear inverse palette). */
export const DesignColorsStaffLight: DesignColorPalette = {
  ...DesignColorsLight,
  canvas: '#E4E8F0',
  surface1: '#FFFFFF',
  surface2: '#F5F7FA',
  surface3: '#EEF1F6',
  surface4: '#E2E8F0',
  hairline: 'rgba(15, 23, 42, 0.07)',
  hairlineStrong: 'rgba(15, 23, 42, 0.11)',
  hairlineTertiary: 'rgba(15, 23, 42, 0.15)',
  glowEmerald: 'rgba(5,150,105,0.12)',
  glowViolet: 'rgba(94,106,210,0.14)',
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
  section: 28,
} as const;

const TypeScale = 1;
const scaleType = (value: number) => Math.round(value * TypeScale);
const scaleLine = (value: number, multiplier: number) => Math.round(scaleType(value) * multiplier);

export const Typography = {
  displayMd: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(34),
    fontWeight: '600',
    lineHeight: scaleLine(34, 1.15),
    letterSpacing: -0.8,
  },
  headline: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(26),
    fontWeight: '600',
    lineHeight: scaleLine(26, 1.2),
    letterSpacing: -0.5,
  },
  cardTitle: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(20),
    fontWeight: '600',
    lineHeight: scaleLine(20, 1.25),
    letterSpacing: -0.3,
  },
  pageTitle: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(24),
    fontWeight: '600',
    lineHeight: scaleLine(24, 1.25),
    letterSpacing: -0.4,
  },
  metricValue: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(32),
    fontWeight: '700',
    lineHeight: scaleLine(32, 1.1),
    letterSpacing: -0.6,
  },
  subhead: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(18),
    fontWeight: '500',
    lineHeight: scaleLine(18, 1.35),
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(16),
    fontWeight: '400',
    lineHeight: scaleLine(16, 1.5),
    letterSpacing: -0.05,
  },
  bodySm: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(15),
    fontWeight: '400',
    lineHeight: scaleLine(15, 1.45),
    letterSpacing: 0,
  },
  caption: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(13),
    fontWeight: '400',
    lineHeight: scaleLine(13, 1.4),
    letterSpacing: 0,
  },
  button: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(16),
    fontWeight: '600',
    lineHeight: scaleLine(16, 1.2),
    letterSpacing: 0,
  },
  eyebrow: {
    fontFamily: Fonts.sans,
    fontSize: scaleType(12),
    fontWeight: '600',
    lineHeight: scaleLine(12, 1.3),
    letterSpacing: 0.8,
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: scaleType(15),
    fontWeight: '500',
    lineHeight: scaleLine(15, 1.4),
    letterSpacing: 0.3,
  },
} as const;

export const TypeUtils = {
  scaleType,
} as const;
