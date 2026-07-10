import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { useAppToast } from "@/components/app-toast";
import { ThemedText } from "@/components/themed-text";
import { StaffActionButton } from "@/features/staff/components/staff-action-button";
import { StaffPageShell } from "@/features/staff/components/staff-page-shell";
import { useStaffRoleGuard } from "@/features/staff/hooks/use-staff-role-guard";
import { createStaffStyles } from "@/features/staff/styles/common";
import { useDesignColors } from "@/hooks/use-design-colors";
import { useLanguagePreference } from "@/hooks/language-preference";
import { useSessionRole } from "@/hooks/session-role";
import { extractRoleNameFromProfile, getMyProfile, logout, type UserProfile } from "@/lib/auth-api";
import { AUTH_ROUTES, resolveRoleLabel, STAFF_ROUTES } from "@/roles";

export default function StaffProfileScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const { refreshRole } = useSessionRole();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await getMyProfile();
      setProfile(user);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t("Không tải được hồ sơ", "Cannot load profile"),
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      await refreshRole();
      showToast(t("Đã đăng xuất", "Logged out successfully"), "success");
      router.replace(AUTH_ROUTES.signIn as never);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t("Không thể đăng xuất", "Cannot log out"),
        "error",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  const roleName = profile ? extractRoleNameFromProfile(profile) : null;

  return (
    <StaffPageShell
      eyebrow={t("Hồ sơ", "Profile")}
      title={t("Tài khoản nhân viên", "Staff account")}
      subtitle={t("Thông tin đăng nhập và phiên làm việc.", "Login details and work session.")}
    >
      <View style={styles.card}>
        {isLoading ? (
          <ActivityIndicator color={DesignColors.accentViolet} />
        ) : (
          <>
            <ThemedText style={styles.profileName}>{profile?.fullName ?? "—"}</ThemedText>
            <ThemedText style={styles.profileMeta}>{profile?.email ?? "—"}</ThemedText>
            <ThemedText style={styles.profileMeta}>{profile?.phone ?? "—"}</ThemedText>
            <View style={styles.statusBadgeActive}>
              <ThemedText style={styles.statusBadgeTextActive}>
                {resolveRoleLabel(roleName, t)}
              </ThemedText>
            </View>
          </>
        )}
      </View>

      <Pressable
        onPress={() => router.push(STAFF_ROUTES.settings as never)}
        style={({ pressed }) => [styles.settingsButton, pressed && styles.buttonPressed]}
      >
        <Ionicons color={DesignColors.accentViolet} name="settings-outline" size={20} />
        <ThemedText style={styles.settingsButtonText}>
          {t("Cài đặt hiển thị", "Display settings")}
        </ThemedText>
        <Ionicons color={DesignColors.inkSubtle} name="chevron-forward" size={18} />
      </Pressable>

      <StaffActionButton
        disabled={isLoggingOut}
        label={t("Đăng xuất", "Log out")}
        loading={isLoggingOut}
        onPress={handleLogout}
        style={styles.fullWidthButton}
        variant="danger"
      />
    </StaffPageShell>
  );
}
