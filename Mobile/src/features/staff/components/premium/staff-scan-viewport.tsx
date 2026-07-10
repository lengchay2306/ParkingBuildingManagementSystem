import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, Typography } from "@/constants/design";
import { useDesignColors } from "@/hooks/use-design-colors";

type StaffScanViewportProps = {
  onPress: () => void;
  statusText: string;
  disabled?: boolean;
};

export function StaffScanViewport({ onPress, statusText, disabled }: StaffScanViewportProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shell,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.cornerTL} />
      <View style={styles.cornerTR} />
      <View style={styles.cornerBL} />
      <View style={styles.cornerBR} />
      <View style={styles.inner}>
        <Ionicons color={DesignColors.primary} name="scan-outline" size={36} />
        <ThemedText style={styles.status}>{statusText}</ThemedText>
        <ThemedText style={styles.hint}>Tap to open camera scanner</ThemedText>
      </View>
    </Pressable>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  const cornerBase = {
    position: "absolute" as const,
    width: 28,
    height: 28,
    borderColor: DesignColors.primary,
  };

  return StyleSheet.create({
    shell: {
      minHeight: 200,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: `${DesignColors.primary}55`,
      backgroundColor: DesignColors.surface2,
      overflow: "hidden",
      shadowColor: DesignColors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 4,
    },
    pressed: {
      opacity: 0.92,
      transform: [{ scale: 0.995 }],
    },
    disabled: {
      opacity: 0.6,
    },
    inner: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: Spacing.lg,
      gap: Spacing.xs,
    },
    status: {
      ...Typography.eyebrow,
      color: DesignColors.primary,
      letterSpacing: 1.4,
      marginTop: Spacing.xs,
    },
    hint: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    cornerTL: {
      ...cornerBase,
      top: 16,
      left: 16,
      borderTopWidth: 2,
      borderLeftWidth: 2,
    },
    cornerTR: {
      ...cornerBase,
      top: 16,
      right: 16,
      borderTopWidth: 2,
      borderRightWidth: 2,
    },
    cornerBL: {
      ...cornerBase,
      bottom: 16,
      left: 16,
      borderBottomWidth: 2,
      borderLeftWidth: 2,
    },
    cornerBR: {
      ...cornerBase,
      bottom: 16,
      right: 16,
      borderBottomWidth: 2,
      borderRightWidth: 2,
    },
  });
}
