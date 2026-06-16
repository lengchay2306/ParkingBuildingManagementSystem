import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { MaxContentWidth } from '@/constants/theme';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useProtectedSession } from '@/hooks/use-protected-session';
import {
  extractRoleNameFromProfile,
  getMyProfile,
  logout,
  type UserProfile,
  type UserVehicle,
} from '@/lib/auth-api';
import {
  buildProfileUpdatePayload,
  updateMyProfile,
  validateProfileUpdate,
} from '@/roles/customer/profile';
import { AUTH_ROUTES, CUSTOMER_ROUTES, resolveRoleLabel } from '@/roles';

function formatDate(value: string | undefined) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function statusTone(status: string | undefined, DesignColors: DesignColorPalette) {
  const normalized = status?.toUpperCase();
  if (normalized === 'ACTIVE') {
    return { label: normalized, color: DesignColors.semanticSuccess };
  }
  if (normalized === 'LOCKED') {
    return { label: normalized, color: '#ef4444' };
  }
  return { label: normalized ?? '—', color: DesignColors.inkSubtle };
}

function VehicleCard({
  vehicle,
  t,
  styles,
  DesignColors,
}: {
  vehicle: UserVehicle;
  t: (vi: string, en: string) => string;
  styles: ReturnType<typeof createStyles>;
  DesignColors: DesignColorPalette;
}) {
  const card = vehicle.monthlyCardId;
  const vehicleType = vehicle.vehicleTypeId?.type ?? '—';
  const cardStatus = statusTone(card?.status, DesignColors);

  return (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <View style={styles.plateBadge}>
          <ThemedText style={styles.plateText}>{vehicle.licensePlate}</ThemedText>
        </View>
        <View style={[styles.statusPill, { borderColor: cardStatus.color }]}>
          <ThemedText style={[styles.statusPillText, { color: cardStatus.color }]}>
            {vehicle.status ?? '—'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.infoRow}>
        <ThemedText style={styles.infoLabel}>{t('Loại xe', 'Vehicle type')}</ThemedText>
        <ThemedText style={styles.infoValue}>{vehicleType}</ThemedText>
      </View>

      {card ? (
        <>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>{t('Thẻ tháng', 'Monthly card')}</ThemedText>
            <ThemedText style={styles.infoValueMono}>{card.cardCode ?? '—'}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>{t('Hiệu lực', 'Valid period')}</ThemedText>
            <ThemedText style={styles.infoValue}>
              {formatDate(card.startDate)} - {formatDate(card.endDate)}
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>{t('Trạng thái thẻ', 'Card status')}</ThemedText>
            <ThemedText style={[styles.infoValue, { color: cardStatus.color }]}>
              {card.status ?? '—'}
            </ThemedText>
          </View>
        </>
      ) : (
        <ThemedText style={styles.noCardText}>
          {t('Chưa có thẻ tháng', 'No monthly card linked')}
        </ThemedText>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  useProtectedSession();

  const loadProfile = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const user = await getMyProfile();
      setProfile(user);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : t('Không tải được hồ sơ', 'Could not load profile');
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function startEditing() {
    if (!profile) {
      return;
    }
    setEditFullName(profile.fullName);
    setEditPhone(profile.phone ?? '');
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditFullName('');
    setEditPhone('');
  }

  async function handleSaveProfile() {
    if (!profile) {
      return;
    }

    const payload = buildProfileUpdatePayload(profile, editFullName, editPhone);
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
      setIsEditing(false);
      showToast(t('Đã cập nhật hồ sơ', 'Profile updated'), 'success');
    } catch (saveError) {
      showToast(
        saveError instanceof Error
          ? saveError.message
          : t('Không thể cập nhật hồ sơ', 'Could not update profile'),
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
      showToast(t('Đã đăng xuất', 'Logged out successfully'), 'success');
      router.replace(AUTH_ROUTES.signIn as never);
    } catch (logoutError) {
      showToast(
        logoutError instanceof Error
          ? logoutError.message
          : t('Không thể đăng xuất', 'Cannot log out'),
        'error',
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  const roleName = profile ? extractRoleNameFromProfile(profile) : null;
  const accountStatus = statusTone(profile?.status, DesignColors);
  const vehicles = profile?.vehicles ?? [];

  if (isLoading && !profile) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={DesignColors.primary} size="large" />
        <ThemedText style={styles.loadingText}>{t('Đang tải hồ sơ...', 'Loading profile...')}</ThemedText>
      </ThemedView>
    );
  }

  if (error && !profile) {
    return (
      <ThemedView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={40} color={DesignColors.inkSubtle} />
        <ThemedText style={styles.errorTitle}>{t('Không tải được hồ sơ', 'Profile unavailable')}</ThemedText>
        <ThemedText style={styles.errorDetail}>{error}</ThemedText>
        <Pressable
          onPress={() => loadProfile()}
          style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
        >
          <ThemedText style={styles.retryButtonText}>{t('Thử lại', 'Retry')}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadProfile(true)}
            tintColor={DesignColors.primary}
          />
        }
      >
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>{t('Tài khoản', 'Account')}</ThemedText>
          <ThemedText style={styles.title}>{t('Hồ sơ của tôi', 'My profile')}</ThemedText>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>
              {getInitials(profile?.fullName ?? '')}
            </ThemedText>
          </View>
          <View style={styles.heroText}>
            <ThemedText style={styles.heroName}>{profile?.fullName}</ThemedText>
            <ThemedText style={styles.heroEmail}>{profile?.email}</ThemedText>
            <View style={styles.heroMetaRow}>
              <View style={styles.roleBadge}>
                <ThemedText style={styles.roleBadgeText}>
                  {resolveRoleLabel(roleName, t)}
                </ThemedText>
              </View>
              <View style={[styles.statusPill, { borderColor: accountStatus.color }]}>
                <ThemedText style={[styles.statusPillText, { color: accountStatus.color }]}>
                  {accountStatus.label}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>{t('Thông tin liên hệ', 'Contact info')}</ThemedText>
            {!isEditing ? (
              <Pressable
                onPress={startEditing}
                style={({ pressed }) => [styles.editButton, pressed && styles.buttonPressed]}
                accessibilityLabel={t('Chỉnh sửa', 'Edit')}
              >
                <Ionicons name="create-outline" size={18} color={DesignColors.primary} />
              </Pressable>
            ) : null}
          </View>

          {isEditing ? (
            <>
              <View style={styles.field}>
                <ThemedText style={styles.fieldLabel}>{t('Họ tên', 'Full name')}</ThemedText>
                <TextInput
                  value={editFullName}
                  onChangeText={setEditFullName}
                  autoCapitalize="words"
                  maxLength={30}
                  placeholder={t('Nhập họ tên', 'Enter full name')}
                  placeholderTextColor={DesignColors.inkSubtle}
                  style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <ThemedText style={styles.fieldLabel}>{t('Số điện thoại', 'Phone')}</ThemedText>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholder={t('10 chữ số', '10 digits')}
                  placeholderTextColor={DesignColors.inkSubtle}
                  style={styles.input}
                />
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>{t('Email', 'Email')}</ThemedText>
                <ThemedText style={styles.infoValue}>{profile?.email}</ThemedText>
              </View>
              <View style={styles.editActions}>
                <Pressable
                  disabled={isSaving}
                  onPress={cancelEditing}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <ThemedText style={styles.secondaryButtonText}>{t('Hủy', 'Cancel')}</ThemedText>
                </Pressable>
                <Pressable
                  disabled={isSaving}
                  onPress={handleSaveProfile}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  {isSaving ? (
                    <ActivityIndicator color={DesignColors.onPrimary} size="small" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>{t('Lưu', 'Save')}</ThemedText>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>{t('Họ tên', 'Full name')}</ThemedText>
                <ThemedText style={styles.infoValue}>{profile?.fullName}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>{t('Số điện thoại', 'Phone')}</ThemedText>
                <ThemedText style={styles.infoValue}>{profile?.phone ?? '—'}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>{t('Email', 'Email')}</ThemedText>
                <ThemedText style={styles.infoValue}>{profile?.email}</ThemedText>
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              {t('Xe đã đăng ký', 'Registered vehicles')}
            </ThemedText>
            <ThemedText style={styles.sectionCount}>{vehicles.length}</ThemedText>
          </View>

          {vehicles.length === 0 ? (
            <ThemedText style={styles.emptyText}>
              {t('Chưa có xe nào trong tài khoản.', 'No vehicles on this account yet.')}
            </ThemedText>
          ) : (
            vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle._id}
                vehicle={vehicle}
                t={t}
                styles={styles}
                DesignColors={DesignColors}
              />
            ))
          )}
        </View>

        <Pressable
          onPress={() => router.push(CUSTOMER_ROUTES.settings as never)}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.buttonPressed]}
        >
          <Ionicons name="settings-outline" size={18} color={DesignColors.ink} />
          <ThemedText style={styles.settingsButtonText}>
            {t('Cài đặt hiển thị', 'Display settings')}
          </ThemedText>
          <Ionicons name="chevron-forward" size={18} color={DesignColors.inkSubtle} />
        </Pressable>

        <Pressable
          disabled={isLoggingOut}
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.buttonPressed]}
        >
          {isLoggingOut ? (
            <ActivityIndicator color={DesignColors.onPrimary} />
          ) : (
            <ThemedText style={styles.logoutButtonText}>{t('Đăng xuất', 'Log out')}</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    content: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.section,
      gap: Spacing.lg,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
      paddingBottom: Spacing.xxl,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      padding: Spacing.lg,
      backgroundColor: DesignColors.canvas,
    },
    loadingText: {
      ...Typography.bodySm,
      color: DesignColors.inkSubtle,
    },
    errorTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      textAlign: 'center',
    },
    errorDetail: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: DesignColors.primary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 10,
    },
    retryButtonText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
    },
    header: {
      gap: Spacing.xs,
    },
    eyebrow: {
      ...Typography.eyebrow,
      textTransform: 'uppercase',
      color: DesignColors.inkSubtle,
    },
    title: {
      ...Typography.displayMd,
      color: DesignColors.ink,
    },
    heroCard: {
      flexDirection: 'row',
      gap: Spacing.md,
      alignItems: 'center',
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      padding: Spacing.lg,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.surface3,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    avatarText: {
      ...Typography.cardTitle,
      color: DesignColors.primaryHover,
    },
    heroText: {
      flex: 1,
      gap: 4,
    },
    heroName: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    heroEmail: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    heroMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginTop: 4,
    },
    roleBadge: {
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.surface2,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    roleBadgeText: {
      ...Typography.caption,
      color: DesignColors.primary,
      textTransform: 'uppercase',
    },
    card: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      ...Typography.button,
      color: DesignColors.ink,
    },
    sectionCount: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    editButton: {
      width: 32,
      height: 32,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    field: {
      gap: Spacing.xs,
    },
    fieldLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textTransform: 'uppercase',
    },
    input: {
      ...Typography.body,
      color: DesignColors.ink,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 10,
    },
    editActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    secondaryButton: {
      flex: 1,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      paddingVertical: 10,
      alignItems: 'center',
    },
    secondaryButtonText: {
      ...Typography.button,
      color: DesignColors.ink,
    },
    primaryButton: {
      flex: 1,
      borderRadius: Radius.md,
      backgroundColor: DesignColors.primary,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
    },
    primaryButtonText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: Spacing.md,
      paddingVertical: 4,
    },
    infoLabel: {
      ...Typography.bodySm,
      color: DesignColors.inkSubtle,
      flex: 1,
    },
    infoValue: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      flex: 1,
      textAlign: 'right',
    },
    infoValueMono: {
      ...Typography.mono,
      color: DesignColors.ink,
      flex: 1,
      textAlign: 'right',
    },
    vehicleCard: {
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      padding: Spacing.md,
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    vehicleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      marginBottom: 4,
    },
    plateBadge: {
      borderRadius: Radius.sm,
      backgroundColor: DesignColors.surface1,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    plateText: {
      ...Typography.mono,
      color: DesignColors.ink,
      letterSpacing: 0.5,
    },
    statusPill: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    statusPillText: {
      ...Typography.caption,
      textTransform: 'uppercase',
    },
    noCardText: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      marginTop: 4,
    },
    emptyText: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    settingsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
    },
    settingsButtonText: {
      ...Typography.button,
      color: DesignColors.ink,
      flex: 1,
    },
    logoutButton: {
      borderRadius: Radius.md,
      backgroundColor: DesignColors.primary,
      paddingVertical: 12,
      alignItems: 'center',
    },
    logoutButtonText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
    },
    buttonPressed: {
      opacity: 0.85,
    },
  });
