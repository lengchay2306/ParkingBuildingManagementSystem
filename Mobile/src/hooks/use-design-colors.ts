import { DesignColorPalette, DesignColors, DesignColorsLight } from "@/constants/design";
import { useThemePreference } from "@/hooks/theme-preference";

export function useDesignColors(): DesignColorPalette {
  const { resolvedScheme } = useThemePreference();
  return resolvedScheme === "light" ? DesignColorsLight : DesignColors;
}
