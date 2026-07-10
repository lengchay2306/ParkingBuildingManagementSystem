import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, Typography } from "@/constants/design";
import { useDesignColors } from "@/hooks/use-design-colors";

type ChatQuickPromptsProps = {
  prompts: [string, string][];
  t: (vi: string, en: string) => string;
  disabled?: boolean;
  onSelect: (message: string) => void;
};

export function ChatQuickPrompts({ prompts, t, disabled, onSelect }: ChatQuickPromptsProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  if (prompts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons color={DesignColors.inkSubtle} name="bulb-outline" size={14} />
        <ThemedText style={styles.label}>{t("Gợi ý câu hỏi", "Suggested questions")}</ThemedText>
      </View>
      <View style={styles.list}>
        {prompts.map(([vi, en]) => {
          const label = t(vi, en);
          return (
            <Pressable
              key={vi}
              disabled={disabled}
              onPress={() => onSelect(label)}
              style={({ pressed }) => [
                styles.chip,
                disabled && styles.chipDisabled,
                pressed && !disabled && styles.chipPressed,
              ]}
            >
              <ThemedText numberOfLines={2} style={styles.chipText}>
                {label}
              </ThemedText>
              <Ionicons color={DesignColors.primaryFocus} name="arrow-forward" size={14} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    container: {
      flexShrink: 0,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xs,
      gap: Spacing.xs,
      backgroundColor: DesignColors.surface1,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    label: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    list: {
      gap: Spacing.xs,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.canvas,
    },
    chipDisabled: {
      opacity: 0.5,
    },
    chipPressed: {
      opacity: 0.9,
      borderColor: DesignColors.primaryFocus,
      backgroundColor: `${DesignColors.primaryFocus}08`,
    },
    chipText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontSize: 12,
      lineHeight: 16,
      flex: 1,
    },
  });
}
