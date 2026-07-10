import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, Typography } from "@/constants/design";
import { useDesignColors } from "@/hooks/use-design-colors";

type StaffActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function StaffActionButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  compact = false,
  style,
}: StaffActionButtonProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createButtonStyles(DesignColors), [DesignColors]);
  const isPrimary = variant === "primary" || variant === "danger";

  const textStyle =
    variant === "secondary" || variant === "ghost" ? styles.secondaryText : styles.primaryText;

  const gradientStops =
    variant === "danger"
      ? [
          { offset: "0%", color: "#EF4444" },
          { offset: "100%", color: "#F97316" },
        ]
      : [
          { offset: "0%", color: DesignColors.primary },
          { offset: "100%", color: DesignColors.primaryFocus },
        ];

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {isPrimary ? (
        <View style={[styles.gradientShell, compact && styles.compactGradient]}>
          <Svg height="100%" style={StyleSheet.absoluteFill} width="100%">
            <Defs>
              <LinearGradient id="staffBtnGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                {gradientStops.map((stop) => (
                  <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect fill="url(#staffBtnGrad)" height="100%" rx={Radius.lg} width="100%" />
          </Svg>
          <View style={[styles.labelWrap, compact && styles.labelWrapCompact]}>
            {loading ? (
              <ActivityIndicator color={DesignColors.onPrimary} size="small" />
            ) : (
              <ThemedText style={textStyle}>{label}</ThemedText>
            )}
          </View>
        </View>
      ) : (
        <View style={[styles.labelWrap, compact && styles.labelWrapCompact]}>
          {loading ? (
            <ActivityIndicator color={DesignColors.ink} size="small" />
          ) : (
            <ThemedText style={textStyle}>{label}</ThemedText>
          )}
        </View>
      )}
    </Pressable>
  );
}

function createButtonStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    base: {
      borderRadius: Radius.lg,
      overflow: "hidden",
      minHeight: 48,
    },
    compact: {
      minHeight: 44,
      minWidth: 80,
    },
    compactGradient: {
      height: 44,
    },
    gradientShell: {
      height: 48,
      borderRadius: Radius.lg,
      overflow: "hidden",
      shadowColor: DesignColors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    secondary: {
      backgroundColor: "rgba(255,255,255,0.04)",
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
    },
    ghost: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.88,
      transform: [{ scale: 0.985 }],
    },
    labelWrap: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    labelWrapCompact: {
      minHeight: 44,
      paddingHorizontal: Spacing.md,
    },
    primaryText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
      fontWeight: "600",
    },
    secondaryText: {
      ...Typography.button,
      color: DesignColors.ink,
      fontWeight: "500",
    },
  });
}
