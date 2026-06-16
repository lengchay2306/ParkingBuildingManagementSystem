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
  semanticSuccess: '#27a644',
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
  semanticSuccess: '#27a644',
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
