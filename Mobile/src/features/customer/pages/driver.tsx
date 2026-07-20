import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { MaxContentWidth } from '@/constants/theme';
import {
  getMyParkingSessions,
  type CustomerParkingSession,
} from '@/features/customer/api/parking';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useProtectedSession } from '@/hooks/use-protected-session';
import { getMyProfile, type UserProfile } from '@/lib/auth-api';
import { formatDbStatus } from '@/lib/db-status';
import { CUSTOMER_ROUTES } from '@/roles';

type SessionFilter = 'ALL' | 'ACTIVE' | 'COMPLETED';

const STATUS_FILTERS: Array<{ value: SessionFilter; label: string }> = [
  { value: 'ALL', label: 'ALL' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'COMPLETED', label: 'COMPLETED' },
];

function formatDateTime(value: string | undefined | null) {
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
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatElapsed(checkInTime: string | undefined) {
  if (!checkInTime) {
    return '00:00:00';
  }
  const diff = Math.max(0, Date.now() - new Date(checkInTime).getTime());
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1_000);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function resolveSlotLabel(session: CustomerParkingSession) {
  if (typeof session.parkingSlotId !== 'object') {
    return '—';
  }
  const floor = session.parkingSlotId.floorId?.floorName;
  const slot = session.parkingSlotId.slotNumber;
  if (floor && slot) {
    return `${floor} · ${slot}`;
  }
  return slot ?? '—';
}

function resolvePlate(session: CustomerParkingSession) {
  if (typeof session.vehicleId === 'object' && session.vehicleId.licensePlate) {
    return session.vehicleId.licensePlate;
  }
  return '—';
}

function statusTone(status: string | undefined, DesignColors: DesignColorPalette) {
  const normalized = formatDbStatus(status);
  if (normalized === 'ACTIVE') {
    return { label: normalized, color: DesignColors.semanticSuccess };
  }
  if (normalized === 'COMPLETED') {
    return { label: normalized, color: DesignColors.inkMuted };
  }
  return { label: normalized, color: DesignColors.inkSubtle };
}

/** Driver parking sessions — list + status filter (DB enums). */
export default function DriverScreen() {
  const router = useRouter();
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  useProtectedSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<CustomerParkingSession[]>([]);
  const [statusFilter, setStatusFilter] = useState<SessionFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);

  const loadData = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [userProfile, sessionList] = await Promise.all([
          getMyProfile(),
          getMyParkingSessions({
            status: statusFilter === 'ALL' ? undefined : statusFilter,
            limit: 100,
          }),
        ]);
        setProfile(userProfile);
        setSessions(sessionList);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : t('Không tải được phiên gửi xe', 'Could not load parking sessions');
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, t],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const hasActive = sessions.some((session) => session.status?.toUpperCase() === 'ACTIVE');
    if (!hasActive) {
      return;
    }
    const timer = setInterval(() => setNowTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [sessions]);

  if (isLoading && !profile) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={DesignColors.primary} size="large" />
        <ThemedText style={styles.loadingText}>
          {t('Đang tải phiên...', 'Loading sessions...')}
        </ThemedText>
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
            onRefresh={() => void loadData(true)}
            tintColor={DesignColors.primary}
          />
        }
      >
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>PARKASE</ThemedText>
          <ThemedText style={styles.title}>{t('Phiên gửi xe', 'Parking sessions')}</ThemedText>
          <ThemedText style={styles.caption}>
            {t('Xin chào', 'Welcome')}, {profile?.fullName ?? t('Khách hàng', 'Customer')}
          </ThemedText>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <Pressable
                key={filter.value}
                onPress={() => setStatusFilter(filter.value)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  style={[styles.filterChipText, active && styles.filterChipTextActive]}
                >
                  {filter.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={DesignColors.primary} style={styles.listLoader} />
        ) : sessions.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="car-outline" size={28} color={DesignColors.inkSubtle} />
            <ThemedText style={styles.emptyTitle}>
              {t('Chưa có phiên gửi xe', 'No parking sessions')}
            </ThemedText>
            <ThemedText style={styles.muted}>
              {t(
                'Khi xe được check-in, lịch sử phiên sẽ hiện tại đây.',
                'When your vehicle is checked in, session history appears here.',
              )}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.sessionList}>
            {sessions.map((session) => {
              const tone = statusTone(session.status, DesignColors);
              const isActive = tone.label === 'ACTIVE';
              return (
                <View key={session._id} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <ThemedText style={styles.plate}>{resolvePlate(session)}</ThemedText>
                    <View style={[styles.statusPill, { borderColor: tone.color }]}>
                      <ThemedText style={[styles.statusPillText, { color: tone.color }]}>
                        {tone.label}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.slotLabel}>{resolveSlotLabel(session)}</ThemedText>
                  <View style={styles.metaRow}>
                    <ThemedText style={styles.metaLabel}>
                      {t('Vào', 'In')}: {formatDateTime(session.checkInTime)}
                    </ThemedText>
                    <ThemedText style={styles.metaLabel}>
                      {t('Ra', 'Out')}:{' '}
                      {isActive ? '—' : formatDateTime(session.checkOutTime)}
                    </ThemedText>
                  </View>
                  {isActive ? (
                    <ThemedText style={styles.timer} key={`timer-${session._id}-${nowTick}`}>
                      {formatElapsed(session.checkInTime)}
                    </ThemedText>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push(CUSTOMER_ROUTES.parkingMap as never)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <ThemedText style={styles.primaryButtonText}>
              {t('Xem bản đồ', 'View map')}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push(CUSTOMER_ROUTES.reservations as never)}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <ThemedText style={styles.secondaryButtonText}>
              {t('Đặt chỗ', 'Reservations')}
            </ThemedText>
          </Pressable>
        </View>
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
      paddingTop: Spacing.section,
      paddingBottom: Spacing.xl,
      gap: Spacing.lg,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: DesignColors.canvas,
    },
    loadingText: {
      ...Typography.body,
      color: DesignColors.inkSubtle,
    },
    header: {
      gap: 4,
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
    caption: {
      ...Typography.bodySm,
      color: DesignColors.inkSubtle,
      marginTop: 2,
    },
    errorBanner: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.semanticDanger,
      backgroundColor: `${DesignColors.semanticDanger}14`,
      padding: Spacing.md,
    },
    errorText: {
      ...Typography.body,
      color: DesignColors.semanticDanger,
    },
    filterRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    filterChip: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface1,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
    },
    filterChipActive: {
      borderColor: DesignColors.primary,
      backgroundColor: `${DesignColors.primary}14`,
    },
    filterChipText: {
      ...Typography.caption,
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 0.6,
      color: DesignColors.inkMuted,
    },
    filterChipTextActive: {
      color: DesignColors.primary,
    },
    listLoader: {
      marginVertical: Spacing.lg,
    },
    sessionList: {
      gap: Spacing.sm,
    },
    sessionCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      padding: Spacing.md,
      gap: Spacing.xs,
    },
    sessionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    plate: {
      ...Typography.mono,
      fontSize: 17,
      color: DesignColors.ink,
      letterSpacing: 0.5,
      flex: 1,
    },
    statusPill: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    statusPillText: {
      ...Typography.caption,
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 0.6,
    },
    slotLabel: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: Spacing.md,
      marginTop: 2,
    },
    metaLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      flex: 1,
    },
    timer: {
      ...Typography.mono,
      fontSize: 22,
      color: DesignColors.semanticSuccess,
      marginTop: Spacing.xs,
    },
    muted: {
      ...Typography.body,
      color: DesignColors.inkMuted,
      textAlign: 'center',
    },
    emptyBlock: {
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
    },
    emptyTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      textAlign: 'center',
    },
    actions: {
      gap: Spacing.sm,
    },
    primaryButton: {
      borderRadius: Radius.lg,
      backgroundColor: DesignColors.primary,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryButtonText: {
      ...Typography.body,
      color: DesignColors.onPrimary,
      fontWeight: '700',
    },
    secondaryButton: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface1,
      paddingVertical: 14,
      alignItems: 'center',
    },
    secondaryButtonText: {
      ...Typography.body,
      color: DesignColors.ink,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.88,
    },
  });
