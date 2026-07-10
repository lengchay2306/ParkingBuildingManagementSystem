import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAppToast } from "@/components/app-toast";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useProtectedSession } from "@/hooks/use-protected-session";
import { useSessionRole } from "@/hooks/session-role";
import { logout } from "@/lib/auth-api";
import { Spacing } from "@/constants/theme";
import { AUTH_ROUTES } from "@/roles";

export default function DashboardScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useProtectedSession();
  const { refreshRole } = useSessionRole();

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      await refreshRole();
      showToast("Logged out successfully", "success");
      router.replace(AUTH_ROUTES.signIn as never);
    } catch (logoutError) {
      showToast(logoutError instanceof Error ? logoutError.message : "Cannot log out", "error");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText style={styles.title}>Dashboard</ThemedText>
          <ThemedText style={styles.subtitle}>Temporary placeholder after sign in.</ThemedText>

          <Pressable
            disabled={isLoggingOut}
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.buttonPressed]}
          >
            {isLoggingOut ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.logoutButtonText}>Log out</ThemedText>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#010102",
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    color: "#f7f8f8",
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "600",
  },
  subtitle: {
    color: "#8a8f98",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: Spacing.two,
  },
  logoutButton: {
    minHeight: 40,
    minWidth: 140,
    borderRadius: 8,
    backgroundColor: "#5e6ad2",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
