import { useFocusEffect, useLocalSearchParams, useNavigation, usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import {
  checkStaffPayment,
  createStaffBillQr,
  formatVnd,
  type StaffBillQrResult,
} from '@/features/payment/api';
import {
  StaffSessionDetailGrid,
  StaffStatusBadge,
  type StaffDetailCell,
} from '@/features/staff/components/premium';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffBackButton } from '@/features/staff/components/staff-back-button';
import { StaffPaymentQrModal } from '@/features/staff/components/staff-payment-qr-modal';
import {
  createHiddenStaffTabBarStyle,
  createStaffTabBarStyle,
} from '@/features/staff/components/staff-tab-bar';
import { findStaffActiveSessionById } from '@/features/staff/api';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { StaffTextInput } from '@/features/staff/components/staff-text-input';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import {
  staffPhoneErrorMessage,
  validateStaffPhoneInput,
} from '@/features/staff/lib/session-validation';
import {
  formatDurationFrom,
  formatTimeLabel,
  mapParkingSessionToRecord,
  type StaffCheckInRecord,
} from '@/features/staff/lib/utils';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { STAFF_ROUTES } from '@/roles';

function resolveRouteParam(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function StaffSessionDetailScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { sessionId: sessionIdParam } = useLocalSearchParams<{ sessionId: string | string[] }>();
  const resolvedSessionId = resolveRouteParam(sessionIdParam);
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const DesignColors = useStaffDesignColors();
  const commonStyles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const {
    parkingSessions,
    loadParkingSessions,
    loadParkingSlots,
    checkoutSession,
    recordCheckIn,
  } = useStaffWorkspace();

  const [isLoading, setIsLoading] = useState(false);
  const [hydratedSession, setHydratedSession] = useState<StaffCheckInRecord | null>(null);
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [tick, setTick] = useState(0);
  const [paymentBill, setPaymentBill] = useState<StaffBillQrResult | null>(null);
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentUnpaidNotice, setPaymentUnpaidNotice] = useState<string | null>(null);

  /** Opened from Spots stays under `/staff-slots/...` — don't dump users onto Sessions. */
  const openedFromSlots = pathname.includes('/staff-slots/');
  const fallbackListRoute = openedFromSlots ? STAFF_ROUTES.slots : STAFF_ROUTES.sessions;

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackListRoute as never);
  }, [fallbackListRoute, router]);

  const session = useMemo(() => {
    if (!resolvedSessionId) {
      return null;
    }
    return (
      parkingSessions.find((item) => item.id === resolvedSessionId) ??
      (hydratedSession?.id === resolvedSessionId ? hydratedSession : null)
    );
  }, [hydratedSession, parkingSessions, resolvedSessionId]);

  const hydrateSession = useCallback(async () => {
    if (!resolvedSessionId || session) {
      return;
    }

    setIsLoading(true);
    try {
      await loadParkingSessions({ status: 'ACTIVE', limit: 200 }).catch(() => undefined);

      const remoteSession = await findStaffActiveSessionById(resolvedSessionId);
      if (!remoteSession) {
        return;
      }

      const floors = await loadParkingSlots().catch(() => []);
      const record = mapParkingSessionToRecord(remoteSession, floors);
      recordCheckIn(record);
      setHydratedSession(record);
    } finally {
      setIsLoading(false);
    }
  }, [loadParkingSessions, loadParkingSlots, recordCheckIn, resolvedSessionId, session]);

  const isActive = session?.status.toUpperCase() === 'ACTIVE';
  const isMonthlySession = session?.sessionType?.toUpperCase() === 'MONTH';

  useEffect(() => {
    if (session?.customerPhone && !checkoutPhone) {
      setCheckoutPhone(session.customerPhone);
    }
  }, [checkoutPhone, session?.customerPhone]);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    const timer = setInterval(() => setTick((value) => value + 1), 60_000);
    return () => clearInterval(timer);
  }, [isActive]);

  const detailCells = useMemo<StaffDetailCell[]>(() => {
    if (!session) {
      return [];
    }
    void tick;
    const [spot = '—', floor = '—'] = session.slotLabel.split(' · ');
    const spotValue = floor !== '—' ? `${spot} · ${floor}` : spot;
    return [
      {
        id: 'customer',
        icon: 'person-outline' as const,
        label: t('Khách hàng', 'Customer'),
        value: session.customerName ?? t('Chưa rõ', 'Unknown'),
      },
      {
        id: 'phone',
        icon: 'call-outline' as const,
        label: t('Số điện thoại', 'Phone'),
        value: session.customerPhone ?? '—',
      },
      {
        id: 'spot',
        icon: 'location-outline' as const,
        label: t('Ô gửi', 'Spot'),
        value: spotValue,
      },
      {
        id: 'vehicle',
        icon: 'car-outline' as const,
        label: t('Loại xe', 'Vehicle'),
        value: session.vehicleType ?? t('Chưa rõ', 'Unknown'),
      },
      {
        id: 'entry',
        icon: 'log-in-outline' as const,
        label: t('Giờ vào', 'Entry'),
        value: session.timeLabel,
      },
      {
        id: 'duration',
        icon: 'time-outline' as const,
        label: t('Thời lượng', 'Duration'),
        value: formatDurationFrom(session.checkInTime),
      },
    ];
  }, [session, t, tick]);

  useLayoutEffect(() => {
    navigation.setOptions({ animation: 'none' });
  }, [navigation]);

  const tabNavigation = navigation.getParent()?.getParent() ?? navigation.getParent();

  const hideTabBar = useCallback(() => {
    tabNavigation?.setOptions({ tabBarStyle: createHiddenStaffTabBarStyle() });
  }, [tabNavigation]);

  const tabBarBottomInset = insets.bottom;

  const restoreTabBar = useCallback(() => {
    tabNavigation?.setOptions({
      tabBarStyle: createStaffTabBarStyle(tabBarBottomInset),
    });
  }, [tabNavigation, tabBarBottomInset]);

  useFocusEffect(
    useCallback(() => {
      hideTabBar();
      return restoreTabBar;
    }, [hideTabBar, restoreTabBar]),
  );

  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const handleCheckout = useCallback(
    async (paymentLabel: string) => {
      if (!session) {
        return;
      }
      const phoneResult = validateStaffPhoneInput(checkoutPhone, t);
      if (!phoneResult.ok) {
        showToast(staffPhoneErrorMessage(phoneResult.messageKey, t), 'error');
        return;
      }

      setIsCheckingOut(true);
      try {
        await checkoutSession(session.id, phoneResult.phone);
        showToast(
          t(`${paymentLabel}: checkout thành công`, `${paymentLabel}: checkout successful`),
          'success',
        );
        goBack();
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : t('Checkout thất bại', 'Checkout failed'),
          'error',
        );
      } finally {
        setIsCheckingOut(false);
      }
    },
    [checkoutPhone, checkoutSession, goBack, session, showToast, t],
  );

  const handleCreateBillQr = useCallback(async () => {
    if (!session) {
      return;
    }
    setIsCreatingBill(true);
    try {
      const bill = await createStaffBillQr(session.id);
      setPaymentUnpaidNotice(null);
      setPaymentBill(bill);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : t('Không tạo được mã VietQR', 'Could not create VietQR'),
        'error',
      );
    } finally {
      setIsCreatingBill(false);
    }
  }, [session, showToast, t]);

  const handleConfirmQrPayment = useCallback(async () => {
    if (!paymentBill) {
      return;
    }
    setIsConfirmingPayment(true);
    setPaymentUnpaidNotice(null);
    try {
      const message = await checkStaffPayment(paymentBill.orderCode);
      setPaymentBill(null);
      await loadParkingSessions();
      showToast(message || t('Thanh toán thành công', 'Payment successful'), 'success');
      goBack();
    } catch (error) {
      const notice =
        error instanceof Error
          ? error.message
          : t('Chưa xác nhận được thanh toán', 'Payment not confirmed yet');
      setPaymentUnpaidNotice(notice);
      showToast(
        notice,
        'warning',
        t('Khách chưa thanh toán', 'Customer has not paid'),
      );
    } finally {
      setIsConfirmingPayment(false);
    }
  }, [goBack, loadParkingSessions, paymentBill, showToast, t]);

  if (isLoading && !session) {
    return (
      <View style={[styles.container, { backgroundColor: DesignColors.canvas }]}>
        <View style={[styles.centered, { paddingTop: insets.top + Spacing.xl }]}>
          <ActivityIndicator color={DesignColors.primary} />
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <StaffPageShell reserveBottomNav={false} scrollable>
        <StaffBackButton
          label={t('Quay lại', 'Back')}
          onPress={goBack}
        />
        <View style={commonStyles.card}>
          <ThemedText style={styles.missing}>
            {t('Không tìm thấy phiên gửi xe.', 'Parking session not found.')}
          </ThemedText>
          <StaffActionButton
            label={t('Tải lại', 'Reload')}
            onPress={() => void hydrateSession()}
            style={commonStyles.fullWidthButton}
            variant="secondary"
          />
          <StaffActionButton
            label={t('Về danh sách', 'Back to list')}
            onPress={() => router.replace(fallbackListRoute as never)}
            style={commonStyles.fullWidthButton}
            variant="ghost"
          />
        </View>
      </StaffPageShell>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: DesignColors.canvas }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            // Root SafeAreaView already applies top inset — don't add insets.top again.
            paddingTop: Spacing.sm,
            paddingBottom: Spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}>
        <StaffBackButton label={t('Quay lại', 'Back')} onPress={goBack} />

        <View style={styles.headerCapsule}>
          <ThemedText style={styles.plate}>{session.plate}</ThemedText>
          <StaffStatusBadge label={session.status} tone={isActive ? 'active' : 'exited'} />
        </View>

        <StaffSessionDetailGrid cells={detailCells} />

        <View style={styles.costDivider} />
        <ThemedText style={styles.costLabel}>
          {t('Số tiền phải trả', 'Amount due')}
        </ThemedText>
        <ThemedText style={styles.costValue}>
          {isMonthlySession
            ? t('Miễn phí (thẻ tháng)', 'Free (monthly card)')
            : paymentBill
              ? formatVnd(paymentBill.amount)
              : t('Hiện sau khi tạo VietQR', 'Shown after creating VietQR')}
        </ThemedText>
        {paymentBill && !isMonthlySession ? (
          <ThemedText style={styles.costMeta}>
            {t('Thời gian gửi', 'Parking duration')}:{' '}
            {Number.isFinite(paymentBill.totalHours)
              ? `${paymentBill.totalHours.toFixed(1)} h`
              : '—'}
          </ThemedText>
        ) : (
          <ThemedText style={styles.costMeta}>
            {t('Loại phiên', 'Session type')}: {session.sessionType ?? 'DAILY'} ·{' '}
            {formatTimeLabel(session.checkInTime ?? '')}
          </ThemedText>
        )}
        <ThemedText style={styles.costHint}>
          {isMonthlySession
            ? t(
                'Phiên thẻ tháng: xác nhận SĐT để ra cổng.',
                'Monthly session: confirm phone to exit.',
              )
            : t(
                'Phiên ngày: tạo VietQR → khách quét → xác nhận thanh toán.',
                'Daily session: create VietQR → customer pays → confirm.',
              )}
        </ThemedText>
      </ScrollView>

      {isActive ? (
        <View style={[styles.checkoutBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <ThemedText style={styles.checkoutTitle}>{t('Ra cổng', 'Checkout')}</ThemedText>
          {isMonthlySession ? (
            <>
              <StaffTextInput
                editable={!isCheckingOut}
                keyboardType="phone-pad"
                onChangeText={(text) => setCheckoutPhone(text.replace(/\D/g, '').slice(0, 10))}
                placeholder={t('SĐT khách (10 số)', 'Customer phone (10 digits)')}
                value={checkoutPhone}
              />
              <StaffActionButton
                disabled={isCheckingOut}
                label={t('Xác nhận ra cổng', 'Confirm exit')}
                loading={isCheckingOut}
                onPress={() => void handleCheckout(t('Thẻ tháng', 'Monthly card'))}
              />
            </>
          ) : (
            <StaffActionButton
              disabled={isCreatingBill}
              label={t('Tạo mã VietQR', 'Create VietQR')}
              loading={isCreatingBill}
              onPress={() => void handleCreateBillQr()}
            />
          )}
        </View>
      ) : null}

      <StaffPaymentQrModal
        visible={paymentBill !== null}
        bill={paymentBill}
        plate={session.plate}
        isConfirming={isConfirmingPayment}
        unpaidNotice={paymentUnpaidNotice}
        onDismissUnpaidNotice={() => setPaymentUnpaidNotice(null)}
        onClose={() => {
          setPaymentBill(null);
          setPaymentUnpaidNotice(null);
        }}
        onConfirm={() => void handleConfirmQrPayment()}
        t={t}
      />
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: Spacing.md,
      gap: Spacing.md,
      flexGrow: 0,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    missing: {
      ...Typography.body,
      color: DesignColors.inkMuted,
      marginTop: Spacing.lg,
    },
    headerCapsule: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
    },
    plate: {
      ...Typography.headline,
      color: DesignColors.ink,
      fontWeight: '700',
      letterSpacing: 0.6,
      flex: 1,
    },
    costDivider: {
      height: 1,
      backgroundColor: DesignColors.hairline,
      marginTop: Spacing.xs,
    },
    costLabel: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    costValue: {
      ...Typography.metricValue,
      color: DesignColors.accentSky,
      fontSize: 28,
    },
    costMeta: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    costHint: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontStyle: 'italic',
    },
    checkoutBar: {
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      backgroundColor: DesignColors.canvas,
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
    },
    checkoutTitle: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    checkoutActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    checkoutActionItem: {
      flex: 1,
    },
  });
}
