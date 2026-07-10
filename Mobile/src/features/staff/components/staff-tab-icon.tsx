import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { useDesignColors } from "@/hooks/use-design-colors";

type StaffTabIconProps = {
  focused: boolean;
  color: string;
  size: number;
  name: keyof typeof Ionicons.glyphMap;
  outlineName: keyof typeof Ionicons.glyphMap;
};

export function StaffTabIcon({ focused, color, size, name, outlineName }: StaffTabIconProps) {
  const DesignColors = useDesignColors();

  return (
    <View style={styles.wrap}>
      <Ionicons color={color} name={focused ? name : outlineName} size={size + 1} />
      {focused ? (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: DesignColors.accentViolet,
              shadowColor: DesignColors.accentViolet,
            },
          ]}
        />
      ) : (
        <View style={styles.dotPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 28,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  dotPlaceholder: {
    width: 5,
    height: 5,
  },
});
