import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
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
import { forgotPassword } from "@/lib/auth-api";
import { AUTH_ROUTES } from "@/roles";

export default function ForgotPasswordScreen() {
  useGuestOnlySession();
  const router = useRouter();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const { resolvedScheme } = useThemePreference();
  const palette = resolvedScheme === "dark" ? authDarkPalette : authLightPalette;

  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const styles = useMemo(() => createStyles(palette), [palette]);

  const handleSubmit = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t("Vui lòng nhập email.", "Please enter your email."));
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword(trimmed);
      setSent(true);
      showToast(t("Đã gửi email đặt lại mật khẩu", "Password reset email sent"), "success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("Không gửi được email.", "Could not send the email."),
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
              <ThemedText style={styles.title}>{t("Quên mật khẩu", "Forgot password")}</ThemedText>
              <ThemedText style={styles.subtitle}>
                {t(
                  "Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.",
                  "Enter your account email to receive a password reset link.",
                )}
              </ThemedText>

              {sent ? (
                <View style={styles.stack}>
                  <View style={styles.successBox}>
                    <ThemedText style={styles.successText}>
                      {t(
                        "Kiểm tra email và mở liên kết (hết hạn sau 15p).",
                        "Check your email and open the link (expires in 15m).",
                      )}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => router.replace(AUTH_ROUTES.signIn)}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && { backgroundColor: palette.primaryPressed },
                    ]}
                  >
                    <ThemedText style={styles.primaryButtonText}>
                      {t("Về đăng nhập", "Back to sign in")}
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.stack}>
                  <View style={styles.fieldWrap}>
                    <ThemedText style={styles.label}>{t("EMAIL", "EMAIL")}</ThemedText>
                    <View
                      style={[
                        styles.inputRow,
                        {
                          borderBottomColor: focused
                            ? palette.inputFocusBorder
                            : palette.inputBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={focused ? palette.primary : palette.icon}
                      />
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        autoComplete="email"
                        placeholder={t("you@example.com", "you@example.com")}
                        placeholderTextColor={palette.textMuted}
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
                    disabled={isSubmitting}
                    onPress={() => void handleSubmit()}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (pressed || isSubmitting) && { opacity: isSubmitting ? 0.7 : 1 },
                      pressed && !isSubmitting && { backgroundColor: palette.primaryPressed },
                    ]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <ThemedText style={styles.primaryButtonText}>
                        {t("Gửi liên kết đặt lại", "Send reset link")}
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              )}
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
    successBox: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.successBorder,
      backgroundColor: palette.successBg,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    successText: {
      fontSize: 13,
      lineHeight: 19,
      color: palette.successText,
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
