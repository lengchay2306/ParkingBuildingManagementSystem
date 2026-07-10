import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, Typography } from "@/constants/design";
import { useDesignColors } from "@/hooks/use-design-colors";

type ChatbotFabProps = {
  label: string;
  isOpen: boolean;
  onPress: () => void;
  tabBarOffset?: number;
};

export function ChatbotFab({ label, isOpen, onPress, tabBarOffset = 72 }: ChatbotFabProps) {
  const DesignColors = useDesignColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  if (isOpen) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: tabBarOffset + insets.bottom + 12 }]}
    >
      <Pressable
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons color={DesignColors.onPrimary} name="chatbubble-ellipses" size={22} />
        <ThemedText style={styles.fabLabel}>{label}</ThemedText>
      </Pressable>
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    host: {
      position: "absolute",
      right: Spacing.md,
      zIndex: 40,
    },
    fab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: Radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: DesignColors.primaryFocus,
      borderWidth: 1,
      borderColor: `${DesignColors.primaryFocus}88`,
      shadowColor: DesignColors.primaryFocus,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    fabPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.98 }],
    },
    fabLabel: {
      ...Typography.caption,
      color: DesignColors.onPrimary,
      fontWeight: "700",
      fontSize: 12,
    },
  });
}
