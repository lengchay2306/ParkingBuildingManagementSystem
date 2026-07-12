import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/design';
import {
  buildProfileUpdatePayload,
  getMyProfile,
  updateMyProfile,
  validateProfileUpdate,
} from '@/features/customer/api/profile';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffDarkCard, StaffFilterPills } from '@/features/staff/components/premium';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { StaffTextInput } from '@/features/staff/components/staff-text-input';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { normalizeStaffPhone } from '@/features/staff/lib/session-validation';
import { useStaffScreenTitles } from '@/features/staff/lib/staff-screen-titles';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useLanguagePreference, type AppLanguage } from '@/hooks/language-preference';
import { useSessionRole } from '@/hooks/session-role';
import { useThemePreference, type ThemePreference } from '@/hooks/theme-preference';
import {
  extractRoleNameFromProfile,
  logout,
  type UserProfile,
} from '@/lib/auth-api';
import { AUTH_ROUTES, resolveRoleLabel } from '@/roles';

export default function StaffProfileScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const { showToast } = useAppToast();
  const { language, setLanguage, t } = useLanguagePreference();
  const { themePreference, setThemePreference } = useThemePreference();
  const titles = useStaffScreenTitles();
  const { refreshRole } = useSessionRole();
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const themeOptions = useMemo(
    () => [
      { id: 'system' as const, label: t('Theo máy', 'System') },
      { id: 'dark' as const, label: t('Tối', 'Dark') },
      { id: 'light' as const, label: t('Sáng', 'Light') },
    ],
    [t],
  );

  const languageOptions = useMemo(
    () => [
      { id: 'vi' as const, label: 'Tiếng Việt' },
      { id: 'en' as const, label: 'English' },
    ],
    [],
  );

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await getMyProfile();
      setProfile(user);
      setFullName(user.fullName ?? '');
      setPhone(user.phone ?? '');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Không tải được hồ sơ', 'Cannot load profile'),
        'error',
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

  async function handleSaveProfile() {
    if (!profile) {
      return;
    }

    const payload = buildProfileUpdatePayload(profile, fullName, phone);
    const validationError = validateProfileUpdate(payload, t);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateMyProfile(payload);
      const refreshed = await getMyProfile();
      setProfile(refreshed);
      setFullName(refreshed.fullName ?? '');
      setPhone(refreshed.phone ?? '');
      showToast(t('Đã cập nhật hồ sơ', 'Profile updated'), 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Không thể cập nhật hồ sơ', 'Could not update profile'),
        'error',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      await refreshRole();
      showToast(t('Đã đăng xuất', 'Logged out successfully'), 'success');
      router.replace(AUTH_ROUTES.signIn as never);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Không thể đăng xuất', 'Cannot log out'),
        'error',
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  const roleName = profile ? extractRoleNameFromProfile(profile) : null;

  return (
    <StaffPageShell title={titles.staff}>
      <StaffDarkCard index={0}>
        <View style={localStyles.sectionHead}>
          <ThemedText style={styles.eyebrow}>{t('Hồ sơ', 'Profile')}</ThemedText>
          {roleName ? (
            <View style={styles.statusBadgeActive}>
              <ThemedText style={styles.statusBadgeTextActive}>
                {resolveRoleLabel(roleName, t)}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <ActivityIndicator color={DesignColors.primary} />
        ) : (
          <View style={localStyles.fields}>
            <View style={localStyles.field}>
              <ThemedText style={styles.eyebrow}>{t('Họ tên', 'Full name')}</ThemedText>
              <StaffTextInput
                editable={!isSaving}
                onChangeText={setFullName}
                placeholder={t('Nhập họ tên', 'Enter full name')}
                value={fullName}
              />
            </View>

            <View style={localStyles.field}>
              <ThemedText style={styles.eyebrow}>{t('Số điện thoại', 'Phone')}</ThemedText>
              <StaffTextInput
                editable={!isSaving}
                keyboardType="phone-pad"
                onChangeText={(text) => setPhone(normalizeStaffPhone(text))}
                placeholder={t('10 chữ số', '10 digits')}
                value={phone}
              />
            </View>

            {profile?.email ? (
              <ThemedText style={styles.profileMeta}>
                {t('Email', 'Email')}: {profile.email}
              </ThemedText>
            ) : null}

            <StaffActionButton
              disabled={isSaving || isLoading}
              label={t('Lưu hồ sơ', 'Save profile')}
              loading={isSaving}
              onPress={() => void handleSaveProfile()}
              style={styles.fullWidthButton}
            />
          </View>
        )}
      </StaffDarkCard>

      <StaffDarkCard index={1}>
        <ThemedText style={styles.eyebrow}>{t('Giao diện', 'Appearance')}</ThemedText>
        <ThemedText style={styles.hint}>
          {t('Chọn chế độ sáng / tối / theo máy.', 'Choose light, dark, or system.')}
        </ThemedText>
        <StaffFilterPills
          onChange={(value) => setThemePreference(value as ThemePreference)}
          options={themeOptions}
          value={themePreference}
        />

        <View style={localStyles.divider} />

        <ThemedText style={styles.eyebrow}>{t('Ngôn ngữ', 'Language')}</ThemedText>
        <StaffFilterPills
          onChange={(value) => setLanguage(value as AppLanguage)}
          options={languageOptions}
          value={language}
        />
      </StaffDarkCard>

      <StaffActionButton
        disabled={isLoggingOut}
        label={t('Đăng xuất', 'Log out')}
        loading={isLoggingOut}
        onPress={handleLogout}
        style={styles.fullWidthButton}
        variant="danger"
      />
    </StaffPageShell>
  );
}

const localStyles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  fields: {
    gap: Spacing.sm,
  },
  field: {
    gap: Spacing.xs,
  },
  divider: {
    height: Spacing.sm,
  },
});
