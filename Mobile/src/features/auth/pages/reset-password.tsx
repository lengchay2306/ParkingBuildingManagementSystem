import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppToast } from "@/components/app-toast";
import { ThemedText } from "@/components/themed-text";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import {
  authDarkPalette,
  authLightPalette,
  type AuthScreenPalette,
} from "@/features/auth/lib/auth-screen-palette";
import { useLanguagePreference } from "@/hooks/language-preference";
import { useGuestOnlySession } from "@/hooks/use-guest-only-session";
import { useThemePreference } from "@/hooks/theme-preference";
import { resetPassword } from "@/lib/auth-api";
import { AUTH_ROUTES } from "@/roles";

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return value?.trim() ?? "";
}

export default function ResetPasswordScreen() {
  useGuestOnlySession();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = firstParam(params.token);
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const { resolvedScheme } = useThemePreference();
  const palette = resolvedScheme === "dark" ? authDarkPalette : authLightPalette;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"password" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const styles = useMemo(() => createStyles(palette), [palette]);

  const handleSubmit = async () => {
    setError(null);

    if (!token) {
      setError(
        t(
          "Thiếu token đặt lại mật khẩu. Mở lại liên kết từ email.",
          "Missing reset token. Open the link from your email again.",
        ),
      );
      return;
    }
    if (newPassword.length < 8) {
      setError(
        t("Mật khẩu mới phải có ít nhất 8 kí tự.", "New password must be at least 8 characters."),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("Xác nhận mật khẩu không khớp.", "Password confirmation does not match."));
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      showToast(t("Đã đặt lại mật khẩu", "Password reset successfully"), "success");
      router.replace(AUTH_ROUTES.signIn);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("Không đặt lại được mật khẩu.", "Could not reset password."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentWrap}>
            <Pressable
              onPress={() => router.replace(AUTH_ROUTES.signIn)}
              style={styles.backRow}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={20} color={palette.text} />
              <ThemedText style={styles.backText}>{t("Đăng nhập", "Sign in")}</ThemedText>
            </Pressable>

            <View style={styles.card}>
              <ThemedText style={styles.title}>
                {t("Đặt lại mật khẩu", "Reset password")}
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                {t(
                  "Nhập mật khẩu mới cho tài khoản của bạn.",
                  "Enter a new password for your account.",
                )}
              </ThemedText>

              <View style={styles.stack}>
                {!token ? (
                  <View style={styles.errorBox}>
                    <ThemedText style={styles.errorText}>
                      {t(
                        "Liên kết thiếu token. Hãy mở đúng URL từ email đặt lại mật khẩu.",
                        "This link is missing a token. Open the exact URL from the reset email.",
                      )}
                    </ThemedText>
                  </View>
                ) : null}

                <View style={styles.fieldWrap}>
                  <ThemedText style={styles.label}>{t("MẬT KHẨU MỚI", "NEW PASSWORD")}</ThemedText>
                  <View
                    style={[
                      styles.inputRow,
                      {
                        borderBottomColor:
                          focusedField === "password"
                            ? palette.inputFocusBorder
                            : palette.inputBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={focusedField === "password" ? palette.primary : palette.icon}
                    />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      style={styles.input}
                    />
                    <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color={palette.icon}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fieldWrap}>
                  <ThemedText style={styles.label}>
                    {t("XÁC NHẬN MẬT KHẨU", "CONFIRM PASSWORD")}
                  </ThemedText>
                  <View
                    style={[
                      styles.inputRow,
                      {
                        borderBottomColor:
                          focusedField === "confirm"
                            ? palette.inputFocusBorder
                            : palette.inputBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={focusedField === "confirm" ? palette.primary : palette.icon}
                    />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocusedField("confirm")}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      style={styles.input}
                    />
                  </View>
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <ThemedText style={styles.errorText}>{error}</ThemedText>
                  </View>
                ) : null}

                <Pressable
                  disabled={isSubmitting || !token}
                  onPress={() => void handleSubmit()}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (!token || isSubmitting) && { opacity: 0.6 },
                    pressed &&
                      token &&
                      !isSubmitting && { backgroundColor: palette.primaryPressed },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>
                      {t("Đặt lại mật khẩu", "Reset password")}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(palette: AuthScreenPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.screenBg },
    safeArea: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.two,
      paddingBottom: Spacing.five,
    },
    contentWrap: {
      width: "100%",
      maxWidth: MaxContentWidth,
      alignSelf: "center",
    },
    backRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: Spacing.three,
      alignSelf: "flex-start",
    },
    backText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.cardBg,
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.textMuted,
      marginBottom: 20,
    },
    stack: { gap: 16 },
    fieldWrap: { gap: 8 },
    label: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: palette.label,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderBottomWidth: 1.5,
      paddingBottom: 10,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: palette.text,
      paddingVertical: 4,
    },
    errorBox: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.errorBorder,
      backgroundColor: palette.errorBg,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    errorText: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.errorText,
    },
    primaryButton: {
      height: 48,
      borderRadius: 12,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#ffffff",
    },
  });
}
