import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, Typography } from '@/constants/design';
import {
  StaffSessionDetailGrid,
  StaffStatusBadge,
  type StaffDetailCell,
} from '@/features/staff/components/premium';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffTextInput } from '@/features/staff/components/staff-text-input';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import {
  staffPhoneErrorMessage,
  validateStaffPhoneInput,
} from '@/features/staff/lib/session-validation';
import {
  estimateSessionCost,
  formatDurationFrom,
  formatTimeLabel,
} from '@/features/staff/lib/utils';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

export default function StaffSessionDetailScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const { parkingSessions, loadParkingSessions, checkoutSession } = useStaffWorkspace();

  const [isLoading, setIsLoading] = useState(false);
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [tick, setTick] = useState(0);

  const session = useMemo(
    () => parkingSessions.find((item) => item.id === sessionId) ?? null,
    [parkingSessions, sessionId],
  );

  const isActive = session?.status.toUpperCase() === 'ACTIVE';

  useEffect(() => {
    if (session?.customerPhone && !checkoutPhone) {
      setCheckoutPhone(session.customerPhone);
    }
  }, [checkoutPhone, session?.customerPhone]);

  useEffect(() => {
    if (!sessionId || session) {
      return;
    }
    setIsLoading(true);
    void loadParkingSessions()
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [loadParkingSessions, session, sessionId]);

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

  const hideTabBar = useCallback(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
  }, [navigation]);

  const restoreTabBar = useCallback(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  useEffect(() => {
    hideTabBar();
    return restoreTabBar;
  }, [hideTabBar, restoreTabBar]);

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
        router.back();
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : t('Checkout thất bại', 'Checkout failed'),
          'error',
        );
      } finally {
        setIsCheckingOut(false);
      }
    },
    [checkoutPhone, checkoutSession, router, session, showToast, t],
  );

  if (isLoading && !session) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centered, { paddingTop: insets.top + Spacing.xl }]}>
          <ActivityIndicator color={DesignColors.primary} />
        </View>
      </ThemedView>
    );
  }

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.content, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={styles.back}>{t('← Quay lại', '← Back')}</ThemedText>
          </Pressable>
          <ThemedText style={styles.missing}>
            {t('Không tìm thấy phiên gửi xe.', 'Parking session not found.')}
          </ThemedText>
          <StaffActionButton
            label={t('Tải lại', 'Reload')}
            onPress={() => void loadParkingSessions()}
            style={{ marginTop: Spacing.md }}
            variant="secondary"
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.md,
            paddingBottom: isActive ? insets.bottom + 220 : insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.8 }}>
          <ThemedText style={styles.back}>{t('← Quay lại', '← Back')}</ThemedText>
        </Pressable>

        <View style={styles.headerCapsule}>
          <ThemedText style={styles.plate}>{session.plate}</ThemedText>
          <StaffStatusBadge label={session.status} tone={isActive ? 'active' : 'exited'} />
        </View>

        <StaffSessionDetailGrid cells={detailCells} />

        <View style={styles.costDivider} />
        <ThemedText style={styles.costLabel}>{t('Chi phí ước tính', 'Estimated cost')}</ThemedText>
        <ThemedText style={styles.costValue}>{estimateSessionCost(session.checkInTime)}</ThemedText>
        <ThemedText style={styles.costMeta}>
          {t('Loại phiên', 'Session type')}: {session.sessionType ?? 'DAILY'} ·{' '}
          {formatTimeLabel(session.checkInTime ?? '')}
        </ThemedText>
        <ThemedText style={styles.costHint}>
          {t(
            'Ước tính theo giờ — chưa bao gồm API phí chính thức.',
            'Hourly estimate — official fee API not wired yet.',
          )}
        </ThemedText>
      </ScrollView>

      {isActive ? (
        <View style={[styles.checkoutBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <ThemedText style={styles.checkoutTitle}>{t('Ra cổng', 'Checkout')}</ThemedText>
          <StaffTextInput
            editable={!isCheckingOut}
            keyboardType="phone-pad"
            onChangeText={(text) => setCheckoutPhone(text.replace(/\D/g, '').slice(0, 10))}
            placeholder={t('SĐT khách (10 số)', 'Customer phone (10 digits)')}
            value={checkoutPhone}
          />
          <View style={styles.checkoutActions}>
            <View style={styles.checkoutActionItem}>
              <StaffActionButton
                disabled={isCheckingOut}
                label={t('Tiền mặt', 'Cash')}
                loading={isCheckingOut}
                onPress={() => void handleCheckout(t('Tiền mặt', 'Cash'))}
                variant="secondary"
              />
            </View>
            <View style={styles.checkoutActionItem}>
              <StaffActionButton
                disabled={isCheckingOut}
                label={t('Đã thanh toán', 'Paid')}
                loading={isCheckingOut}
                onPress={() => void handleCheckout(t('Khách đã thanh toán', 'Customer paid'))}
              />
            </View>
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    content: {
      paddingHorizontal: Spacing.md,
      gap: Spacing.lg,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    back: {
      ...Typography.bodySm,
      color: DesignColors.accentSky,
      fontWeight: '600',
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
      marginTop: Spacing.sm,
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
      fontSize: 32,
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
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
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
