import React from "react";
import { StyleSheet, View } from "react-native";

import { DisplaySettingsContent } from "@/components/display-settings-content";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/design";
import { MaxContentWidth } from "@/constants/theme";

export default function SettingsScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <DisplaySettingsContent />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: Spacing.md,
    padding: Spacing.md,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
});
