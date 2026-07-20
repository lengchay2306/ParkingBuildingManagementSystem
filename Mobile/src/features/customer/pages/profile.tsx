import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useSessionRole } from '@/hooks/session-role';
import {
  extractRoleNameFromProfile,
  getMyProfile,
  logout,
  type UserProfile,
  type UserVehicle,
} from '@/lib/auth-api';
import { resolveApiErrorMessage } from '@/lib/api-error';
import { formatDbStatus } from '@/lib/db-status';
import {
  buildProfileUpdatePayload,
  updateMyProfile,
  validateProfileUpdate,
} from '@/features/customer/api/profile';
import {
  buildVehicleUpdatePayload,
  createVehicle,
  getVehicleTypes,
  resolveVehicleTypeId,
  softDeleteVehicle,
  updateVehicle,
  validateVehicleRegistration,
  validateVehicleUpdate,
  type VehicleType,
} from '@/features/customer/api/vehicles';
import { SubscriptionPaymentModal, VehicleCard } from '@/features/customer/components';
import {
  createSubscriptionCheckoutLink,
  type SubscriptionCheckoutResult,
} from '@/features/payment/api';
import type { PayOsCheckoutSessionResult } from '@/features/payment/payos-checkout-session';
import { subscribePayOsDeepLink } from '@/features/payment/payos-return-bridge';
import { AUTH_ROUTES, CUSTOMER_ROUTES, resolveRoleLabel } from '@/roles';

function resolveVehicleApiError(
  error: unknown,
  t: (vi: string, en: string) => string,
): string {
  const message = resolveApiErrorMessage(
    error,
    t('Không thể lưu xe', 'Could not save vehicle'),
  );
  const lower = message.toLowerCase();
  if (lower.includes('license plate must follow format')) {
    return t('Biển số đúng dạng 51A-123.45', 'Plate format: 51A-123.45');
  }
  if (
    lower.includes('already exists') ||
    lower.includes('đã tồn tại') ||
    lower.includes('duplicate')
  ) {
    return t('Biển số đã được đăng ký', 'License plate already registered');
  }
  return message;
}

function vehicleHasMonthlyCard(vehicle: UserVehicle | undefined) {
  if (!vehicle?.monthlyCardId) {
    return false;
  }
  if (typeof vehicle.monthlyCardId === 'object') {
    const status = vehicle.monthlyCardId.status?.toUpperCase();
    return Boolean(vehicle.monthlyCardId._id) || status === 'ACTIVE';
  }
  return true;
}

function findVehicleInProfile(profile: UserProfile | null, vehicleId: string) {
  return profile?.vehicles?.find((item) => item._id === vehicleId);
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

function statusTone(
  status: string | undefined,
  DesignColors: DesignColorPalette,
) {
  const normalized = formatDbStatus(status);
  if (normalized === 'ACTIVE') {
    return { label: normalized, color: DesignColors.semanticSuccess };
  }
  if (normalized === 'LOCKED') {
    return { label: normalized, color: DesignColors.semanticDanger };
  }
  return { label: normalized, color: DesignColors.inkSubtle };
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
  const [vehicleModalMode, setVehicleModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<UserVehicle | null>(null);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [isLoadingVehicleTypes, setIsLoadingVehicleTypes] = useState(false);
  const [licensePlate, setLicensePlate] = useState('');
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState<string | null>(null);
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [buyingVehicleId, setBuyingVehicleId] = useState<string | null>(null);
  const [subscriptionBill, setSubscriptionBill] = useState<SubscriptionCheckoutResult | null>(null);
  const [subscriptionVehicle, setSubscriptionVehicle] = useState<UserVehicle | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const subscriptionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useProtectedSession();
  const { refreshRole } = useSessionRole();

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

  const loadVehicleTypes = useCallback(async () => {
    setIsLoadingVehicleTypes(true);
    try {
      const types = await getVehicleTypes();
      setVehicleTypes(types);
      if (types.length > 0 && !selectedVehicleTypeId) {
        setSelectedVehicleTypeId(types[0]._id);
      }
    } catch (loadError) {
      showToast(
        loadError instanceof Error
          ? loadError.message
          : t('Không tải được loại xe', 'Could not load vehicle types'),
        'error',
      );
    } finally {
      setIsLoadingVehicleTypes(false);
    }
  }, [selectedVehicleTypeId, showToast, t]);

  React.useEffect(() => {
    if (vehicleModalMode && vehicleTypes.length === 0) {
      loadVehicleTypes();
    }
  }, [vehicleModalMode, loadVehicleTypes, vehicleTypes.length]);

  function closeVehicleModal() {
    setVehicleModalMode(null);
    setEditingVehicle(null);
    setLicensePlate('');
    setVehicleFormError(null);
  }

  function startRegisteringVehicle() {
    setEditingVehicle(null);
    setVehicleModalMode('create');
    setLicensePlate('');
    setVehicleFormError(null);
    if (vehicleTypes.length > 0) {
      setSelectedVehicleTypeId(vehicleTypes[0]._id);
    }
  }

  function startEditingVehicle(vehicle: UserVehicle) {
    setEditingVehicle(vehicle);
    setVehicleModalMode('edit');
    setLicensePlate(vehicle.licensePlate);
    setVehicleFormError(null);
    setSelectedVehicleTypeId(resolveVehicleTypeId(vehicle.vehicleTypeId));
    if (vehicleTypes.length === 0) {
      loadVehicleTypes();
    }
  }

  async function handleSubmitVehicle() {
    if (vehicleModalMode === 'create') {
      const validationError = validateVehicleRegistration(licensePlate, selectedVehicleTypeId, t);
      if (validationError) {
        setVehicleFormError(validationError);
        showToast(validationError, 'error');
        return;
      }

      setIsSubmittingVehicle(true);
      setVehicleFormError(null);
      try {
        await createVehicle({
          licensePlate,
          vehicleTypeId: selectedVehicleTypeId!,
        });
        const refreshed = await getMyProfile();
        setProfile(refreshed);
        closeVehicleModal();
        showToast(t('Đã đăng ký xe', 'Vehicle registered'), 'success');
      } catch (submitError) {
        const message = resolveVehicleApiError(submitError, t);
        setVehicleFormError(message);
        showToast(message, 'error');
      } finally {
        setIsSubmittingVehicle(false);
      }
      return;
    }

    if (vehicleModalMode !== 'edit' || !editingVehicle) {
      return;
    }

    const currentTypeId = resolveVehicleTypeId(editingVehicle.vehicleTypeId) ?? '';
    const payload = buildVehicleUpdatePayload(
      { licensePlate: editingVehicle.licensePlate, vehicleTypeId: currentTypeId },
      licensePlate,
      selectedVehicleTypeId ?? currentTypeId,
    );
    const validationError = validateVehicleUpdate(
      payload,
      licensePlate,
      selectedVehicleTypeId,
      t,
    );
    if (validationError) {
      setVehicleFormError(validationError);
      showToast(validationError, 'error');
      return;
    }

    setIsSubmittingVehicle(true);
    setVehicleFormError(null);
    try {
      await updateVehicle(editingVehicle._id, payload);
      const refreshed = await getMyProfile();
      setProfile(refreshed);
      closeVehicleModal();
      showToast(t('Đã cập nhật xe', 'Vehicle updated'), 'success');
    } catch (submitError) {
      const message = resolveVehicleApiError(submitError, t);
      setVehicleFormError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmittingVehicle(false);
    }
  }

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
      await refreshRole();
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
  const activeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status?.toUpperCase() !== 'INACTIVE'),
    [vehicles],
  );

  function confirmDeleteVehicle(vehicle: UserVehicle) {
    Alert.alert(
      t('Xóa xe', 'Delete vehicle'),
      t(
        `Bạn có chắc muốn xóa xe ${vehicle.licensePlate}?.`,
        `Remove ${vehicle.licensePlate}?.`,
      ),
      [
        { text: t('Hủy', 'Cancel'), style: 'cancel' },
        {
          text: t('Xóa', 'Delete'),
          style: 'destructive',
          onPress: () => handleDeleteVehicle(vehicle),
        },
      ],
    );
  }

  async function handleDeleteVehicle(vehicle: UserVehicle) {
    setDeletingVehicleId(vehicle._id);
    try {
      await softDeleteVehicle(vehicle._id);
      const refreshed = await getMyProfile();
      setProfile(refreshed);
      if (editingVehicle?._id === vehicle._id) {
        closeVehicleModal();
      }
      showToast(t('Đã xóa xe', 'Vehicle removed'), 'success');
    } catch (deleteError) {
      showToast(
        deleteError instanceof Error
          ? deleteError.message
          : t('Không thể xóa xe', 'Could not delete vehicle'),
        'error',
      );
    } finally {
      setDeletingVehicleId(null);
    }
  }

  async function handleBuyMonthlyCard(vehicle: UserVehicle) {
    if (vehicleHasMonthlyCard(vehicle)) {
      showToast(t('Xe này đã có thẻ tháng', 'This vehicle already has a monthly card'), 'error');
      return;
    }

    setBuyingVehicleId(vehicle._id);
    try {
      const checkout = await createSubscriptionCheckoutLink(vehicle._id);
      setSubscriptionBill(checkout);
      setSubscriptionVehicle(vehicle);
    } catch (buyError) {
      showToast(
        buyError instanceof Error
          ? buyError.message
          : t('Không tạo được link thanh toán', 'Could not create payment link'),
        'error',
      );
    } finally {
      setBuyingVehicleId(null);
    }
  }

  const stopSubscriptionPoll = useCallback(() => {
    if (subscriptionPollRef.current) {
      clearInterval(subscriptionPollRef.current);
      subscriptionPollRef.current = null;
    }
  }, []);

  const closeSubscriptionPayment = useCallback(() => {
    stopSubscriptionPoll();
    setSubscriptionBill(null);
    setSubscriptionVehicle(null);
    setIsCheckingSubscription(false);
  }, [stopSubscriptionPoll]);

  const refreshSubscriptionActivation = useCallback(async () => {
    if (!subscriptionVehicle) {
      return false;
    }
    const refreshed = await getMyProfile();
    setProfile(refreshed);
    const updated = findVehicleInProfile(refreshed, subscriptionVehicle._id);
    return vehicleHasMonthlyCard(updated);
  }, [subscriptionVehicle]);

  const handleConfirmSubscriptionPaid = useCallback(async () => {
    if (!subscriptionVehicle) {
      return;
    }

    setIsCheckingSubscription(true);
    stopSubscriptionPoll();

    try {
      let activated = await refreshSubscriptionActivation();
      if (activated) {
        showToast(t('Thẻ tháng đã kích hoạt', 'Monthly card activated'), 'success');
        closeSubscriptionPayment();
        return;
      }

      showToast(
        t('Đang chờ PayOS kích hoạt thẻ…', 'Waiting for PayOS to activate the card…'),
        'success',
      );

      let attempts = 0;
      subscriptionPollRef.current = setInterval(() => {
        void (async () => {
          attempts += 1;
          try {
            activated = await refreshSubscriptionActivation();
            if (activated) {
              showToast(t('Thẻ tháng đã kích hoạt', 'Monthly card activated'), 'success');
              closeSubscriptionPayment();
              return;
            }
          } catch {
            // keep polling
          }
          if (attempts >= 12) {
            stopSubscriptionPoll();
            setIsCheckingSubscription(false);
            showToast(
              t(
                'Chưa thấy thẻ. Đợi thêm rồi kéo hồ sơ để làm mới.',
                'Card not visible yet. Wait a bit, then pull to refresh profile.',
              ),
              'error',
            );
          }
        })();
      }, 2500);
    } catch (checkError) {
      setIsCheckingSubscription(false);
      showToast(
        checkError instanceof Error
          ? checkError.message
          : t('Không kiểm tra được thanh toán', 'Could not verify payment'),
        'error',
      );
    }
  }, [
    closeSubscriptionPayment,
    refreshSubscriptionActivation,
    showToast,
    stopSubscriptionPoll,
    subscriptionVehicle,
    t,
  ]);

  const handleCheckoutSessionResult = useCallback(
    (result: PayOsCheckoutSessionResult) => {
      closeSubscriptionPayment();

      if (result.kind === 'dismissed') {
        router.replace(CUSTOMER_ROUTES.paymentReturn as never);
        return;
      }

      const orderCode =
        typeof result.orderCode === 'number'
          ? String(result.orderCode)
          : result.orderCode != null
            ? String(result.orderCode)
            : undefined;
      const qs = orderCode ? `?orderCode=${encodeURIComponent(orderCode)}` : '';

      if (result.kind === 'cancelled') {
        router.replace(`${CUSTOMER_ROUTES.paymentCancel}${qs}` as never);
        return;
      }

      router.replace(`${CUSTOMER_ROUTES.paymentReturn}${qs}` as never);
    },
    [closeSubscriptionPayment, router],
  );

  useEffect(() => {
    return subscribePayOsDeepLink((payload) => {
      if (!subscriptionBill) {
        return;
      }
      if (payload.outcome === 'cancelled') {
        handleCheckoutSessionResult({
          kind: 'cancelled',
          orderCode: payload.orderCode,
          url: payload.url,
        });
        return;
      }
      handleCheckoutSessionResult({
        kind: 'paid',
        orderCode: payload.orderCode,
        url: payload.url,
      });
    });
  }, [handleCheckoutSessionResult, subscriptionBill]);

  React.useEffect(() => () => stopSubscriptionPoll(), [stopSubscriptionPoll]);

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
          <ThemedText style={styles.eyebrow}>PARKASE</ThemedText>
          <ThemedText style={styles.title}>{t('Hồ sơ', 'Profile')}</ThemedText>
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
            <View style={styles.sectionHeaderActions}>
              <ThemedText style={styles.sectionCount}>{activeVehicles.length}</ThemedText>
              <Pressable
                onPress={startRegisteringVehicle}
                style={({ pressed }) => [styles.editButton, pressed && styles.buttonPressed]}
                accessibilityLabel={t('Đăng ký xe', 'Register vehicle')}
              >
                <Ionicons name="add" size={20} color={DesignColors.primary} />
              </Pressable>
            </View>
          </View>

          {activeVehicles.length === 0 ? (
            <ThemedText style={styles.emptyText}>
              {t('Chưa có xe nào trong tài khoản.', 'No vehicles on this account yet.')}
            </ThemedText>
          ) : (
            activeVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle._id}
                vehicle={vehicle}
                t={t}
                styles={styles}
                DesignColors={DesignColors}
                onEdit={() => startEditingVehicle(vehicle)}
                onDelete={() => confirmDeleteVehicle(vehicle)}
                onBuyMonthlyCard={() => void handleBuyMonthlyCard(vehicle)}
                isDeleting={deletingVehicleId === vehicle._id}
                isBuyingMonthlyCard={buyingVehicleId === vehicle._id}
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

      <Modal
        visible={vehicleModalMode !== null}
        animationType="fade"
        transparent
        onRequestClose={closeVehicleModal}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeVehicleModal} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {vehicleModalMode === 'edit'
                  ? t('Cập nhật xe', 'Update vehicle')
                  : t('Đăng ký xe', 'Register vehicle')}
              </ThemedText>
              <Pressable
                onPress={closeVehicleModal}
                style={({ pressed }) => [styles.modalClose, pressed && styles.buttonPressed]}
                accessibilityLabel={t('Đóng', 'Close')}
              >
                <Ionicons name="close" size={20} color={DesignColors.inkMuted} />
              </Pressable>
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>{t('Biển số', 'License plate')}</ThemedText>
              <TextInput
                value={licensePlate}
                onChangeText={(value) => {
                  setLicensePlate(value);
                  if (vehicleFormError) {
                    setVehicleFormError(null);
                  }
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="51A-123.45"
                placeholderTextColor={DesignColors.inkSubtle}
                style={[styles.input, vehicleFormError ? styles.inputError : null]}
              />
              {vehicleFormError ? (
                <ThemedText style={styles.fieldError}>{vehicleFormError}</ThemedText>
              ) : (
                <ThemedText style={styles.modalHint}>
                  {t('Ví dụ đúng: 51A-123.45', 'Example: 51A-123.45')}
                </ThemedText>
              )}
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>{t('Loại xe', 'Vehicle type')}</ThemedText>
              {isLoadingVehicleTypes ? (
                <ActivityIndicator color={DesignColors.primary} style={styles.typeLoader} />
              ) : (
                <View style={styles.typeRow}>
                  {vehicleTypes.map((type) => {
                    const active = selectedVehicleTypeId === type._id;
                    return (
                      <Pressable
                        key={type._id}
                        onPress={() => setSelectedVehicleTypeId(type._id)}
                        style={({ pressed }) => [
                          styles.typeChip,
                          active && styles.typeChipActive,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <ThemedText
                          style={[styles.typeChipText, active && styles.typeChipTextActive]}
                        >
                          {type.type}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.editActions}>
              <Pressable
                disabled={isSubmittingVehicle}
                onPress={closeVehicleModal}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              >
                <ThemedText style={styles.secondaryButtonText}>{t('Hủy', 'Cancel')}</ThemedText>
              </Pressable>
              <Pressable
                disabled={isSubmittingVehicle || isLoadingVehicleTypes}
                onPress={handleSubmitVehicle}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              >
                {isSubmittingVehicle ? (
                  <ActivityIndicator color={DesignColors.onPrimary} size="small" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>
                    {vehicleModalMode === 'edit' ? t('Lưu', 'Save') : t('Đăng ký', 'Register')}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SubscriptionPaymentModal
        visible={!!subscriptionBill}
        bill={subscriptionBill}
        plate={subscriptionVehicle?.licensePlate}
        isCheckingStatus={isCheckingSubscription}
        onClose={closeSubscriptionPayment}
        onConfirmPaid={() => void handleConfirmSubscriptionPaid()}
        onCheckoutSessionResult={handleCheckoutSessionResult}
        t={t}
      />
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
      gap: 2,
    },
    eyebrow: {
      ...Typography.eyebrow,
      textTransform: 'uppercase',
      color: DesignColors.inkSubtle,
    },
    title: {
      ...Typography.headline,
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
      padding: Spacing.md,
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
      padding: Spacing.md,
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
    sectionHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'center',
      padding: Spacing.md,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    modalCard: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      padding: Spacing.lg,
      gap: Spacing.sm,
      maxWidth: MaxContentWidth,
      width: '100%',
      alignSelf: 'center',
      zIndex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    modalTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      flex: 1,
    },
    modalClose: {
      width: 32,
      height: 32,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.surface2,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    modalHint: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      marginTop: 4,
    },
    fieldError: {
      ...Typography.caption,
      color: DesignColors.semanticDanger,
      marginTop: 4,
      fontWeight: '600',
    },
    inputError: {
      borderColor: DesignColors.semanticDanger,
    },
    typeLoader: {
      alignSelf: 'flex-start',
      marginVertical: Spacing.xs,
    },
    typeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    typeChip: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    typeChipActive: {
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface3,
    },
    typeChipText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textTransform: 'uppercase',
    },
    typeChipTextActive: {
      color: DesignColors.primary,
      fontWeight: '600',
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
    vehicleHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    vehicleActionButton: {
      width: 28,
      height: 28,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      alignItems: 'center',
      justifyContent: 'center',
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
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    noCardText: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      marginTop: 4,
    },
    buyCardButton: {
      marginTop: Spacing.sm,
      borderRadius: Radius.md,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
    },
    buyCardButtonText: {
      ...Typography.button,
      fontWeight: '600',
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
