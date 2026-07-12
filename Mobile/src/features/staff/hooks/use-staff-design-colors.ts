import { DesignColorPalette, DesignColors, DesignColorsStaffLight } from '@/constants/design';
import { useThemePreference } from '@/hooks/theme-preference';

export function useStaffDesignColors(): DesignColorPalette {
  const { resolvedScheme } = useThemePreference();
  return resolvedScheme === 'light' ? DesignColorsStaffLight : DesignColors;
}
