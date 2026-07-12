import { DotLottie } from '@lottiefiles/dotlottie-react-native';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/design';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { useThemePreference } from '@/hooks/theme-preference';

const BACK_ARROW_LOTTIE = require('@/components/gif/Arrow left circle.lottie');

type StaffBackButtonProps = {
  onPress: () => void;
  /** Optional caption inside the pill (e.g. "Back"). */
  label?: string;
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Shared staff back control — Lottie + label share one pill background. */
export function StaffBackButton({
  onPress,
  label,
  size = 28,
  disabled = false,
  accessibilityLabel,
  style,
}: StaffBackButtonProps) {
  const DesignColors = useStaffDesignColors();
  const { resolvedScheme } = useThemePreference();
  const isDark = resolvedScheme === 'dark';
  const styles = useMemo(() => createStyles(DesignColors, isDark), [DesignColors, isDark]);
  const iconSize = size;
  const pillHeight = Math.max(size + 10, 40);
  const hasLabel = Boolean(label);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label ?? 'Back'}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          minHeight: pillHeight,
          borderRadius: pillHeight / 2,
          paddingLeft: hasLabel ? 6 : 6,
          paddingRight: hasLabel ? Spacing.md : 6,
          width: hasLabel ? undefined : pillHeight,
          justifyContent: 'center',
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <DotLottie
        autoplay
        loop
        source={BACK_ARROW_LOTTIE}
        style={{ width: iconSize, height: iconSize }}
      />
      {label ? <ThemedText style={styles.label}>{label}</ThemedText> : null}
    </Pressable>
  );
}

function createStyles(
  DesignColors: ReturnType<typeof useStaffDesignColors>,
  isDark: boolean,
) {
  return StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingVertical: 4,
      // Light pill keeps the black Lottie readable on both themes.
      backgroundColor: isDark ? 'rgba(255,255,255,0.94)' : DesignColors.surface1,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : DesignColors.hairlineStrong,
    },
    label: {
      ...Typography.bodySm,
      // Ink on the light pill — not theme canvas ink (which is white in dark mode).
      color: '#101318',
      fontWeight: '600',
      fontSize: 14,
      paddingRight: 2,
    },
    pressed: {
      opacity: 0.82,
    },
    disabled: {
      opacity: 0.45,
    },
  });
}
