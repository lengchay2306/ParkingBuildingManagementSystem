import React, { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Radius, Spacing } from "@/constants/design";
import { useDesignColors } from "@/hooks/use-design-colors";

type StaffDarkCardProps = {
  children: React.ReactNode;
  accentBorder?: "success" | "warning" | "danger" | "primary" | "none";
  style?: StyleProp<ViewStyle>;
};

export function StaffDarkCard({ children, accentBorder = "none", style }: StaffDarkCardProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const borderColor =
    accentBorder === "success"
      ? DesignColors.accentEmerald
      : accentBorder === "warning"
        ? DesignColors.accentAmber
        : accentBorder === "danger"
          ? DesignColors.semanticDanger
          : accentBorder === "primary"
            ? DesignColors.primary
            : "transparent";

  return (
    <View
      style={[
        styles.card,
        accentBorder !== "none" && { borderLeftWidth: 3, borderLeftColor: borderColor },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
  });
}
