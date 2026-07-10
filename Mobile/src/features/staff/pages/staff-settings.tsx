import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAppToast } from "@/components/app-toast";
import { DisplaySettingsContent } from "@/components/display-settings-content";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/design";
import {
  buildProfileUpdatePayload,
  getMyProfile,
  updateMyProfile,
  validateProfileUpdate,
} from "@/features/customer/api/profile";
import { StaffActionButton } from "@/features/staff/components/staff-action-button";
import { StaffPageShell } from "@/features/staff/components/staff-page-shell";
import { StaffTextInput } from "@/features/staff/components/staff-text-input";
import { useStaffRoleGuard } from "@/features/staff/hooks/use-staff-role-guard";
import { normalizeStaffPhone } from "@/features/staff/lib/session-validation";
import { createStaffStyles } from "@/features/staff/styles/common";
import { useDesignColors } from "@/hooks/use-design-colors";
import { useLanguagePreference } from "@/hooks/language-preference";
import type { UserProfile } from "@/lib/auth-api";

export default function StaffSettingsScreen() {
  useStaffRoleGuard();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const user = await getMyProfile();
      setProfile(user);
      setFullName(user.fullName ?? "");
      setPhone(user.phone ?? "");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t("Không tải được hồ sơ", "Cannot load profile"),
        "error",
      );
    } finally {
      setIsLoadingProfile(false);
    }
  }, [showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  async function handleSaveProfile() {
    if (!profile) {
      return;
    }

    const payload = buildProfileUpdatePayload(profile, fullName, phone);
    const validationError = validateProfileUpdate(payload, t);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    setIsSaving(true);
    try {
      await updateMyProfile(payload);
      const refreshed = await getMyProfile();
      setProfile(refreshed);
      setFullName(refreshed.fullName ?? "");
      setPhone(refreshed.phone ?? "");
      showToast(t("Đã cập nhật hồ sơ", "Profile updated"), "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : t("Không thể cập nhật hồ sơ", "Could not update profile"),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <StaffPageShell
      eyebrow={t("Cài đặt", "Settings")}
      title={t("Hồ sơ & hiển thị", "Profile & display")}
      subtitle={t(
        "Cập nhật họ tên, số điện thoại và tùy chọn giao diện cho màn hình nhân viên.",
        "Update your name, phone, and display preferences for staff screens.",
      )}
    >
      <View style={localStyles.panel}>
        <View style={styles.card}>
          <ThemedText style={styles.eyebrow}>{t("Hồ sơ cá nhân", "Personal profile")}</ThemedText>
          <ThemedText style={styles.hint}>
            {t(
              "Thông tin dùng cho tài khoản đăng nhập của bạn.",
              "Information tied to your login account.",
            )}
          </ThemedText>

          {isLoadingProfile ? (
            <ActivityIndicator color={DesignColors.primary} />
          ) : (
            <>
              <View style={localStyles.field}>
                <ThemedText style={styles.eyebrow}>{t("Họ tên", "Full name")}</ThemedText>
                <StaffTextInput
                  editable={!isSaving}
                  onChangeText={setFullName}
                  placeholder={t("Nhập họ tên", "Enter full name")}
                  value={fullName}
                />
              </View>

              <View style={localStyles.field}>
                <ThemedText style={styles.eyebrow}>{t("Số điện thoại", "Phone")}</ThemedText>
                <StaffTextInput
                  editable={!isSaving}
                  keyboardType="phone-pad"
                  onChangeText={(text) => setPhone(normalizeStaffPhone(text))}
                  placeholder={t("10 chữ số", "10 digits")}
                  value={phone}
                />
              </View>

              {profile?.email ? (
                <ThemedText style={styles.hint}>
                  {t("Email", "Email")}: {profile.email}
                </ThemedText>
              ) : null}

              <StaffActionButton
                disabled={isSaving || isLoadingProfile}
                label={t("Lưu hồ sơ", "Save profile")}
                loading={isSaving}
                onPress={() => void handleSaveProfile()}
                style={styles.fullWidthButton}
              />
            </>
          )}
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.eyebrow}>
            {t("Hiển thị & ngôn ngữ", "Display & language")}
          </ThemedText>
          <DisplaySettingsContent />
        </View>
      </View>
    </StaffPageShell>
  );
}

const localStyles = StyleSheet.create({
  panel: {
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.xs,
  },
});
