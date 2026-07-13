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
  getActiveUserParkingSession,
  type CustomerParkingSession,
} from '@/features/customer/api/parking';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useProtectedSession } from '@/hooks/use-protected-session';
import { getMyProfile, type UserProfile, type UserVehicle } from '@/lib/auth-api';
import { CUSTOMER_ROUTES } from '@/roles';

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

function resolveSlotLabel(session: CustomerParkingSession | null) {
  if (!session || typeof session.parkingSlotId !== 'object') {
    return '—';
  }
  const floor = session.parkingSlotId.floorId?.floorName;
  const slot = session.parkingSlotId.slotNumber;
  if (floor && slot) {
    return `${floor} · ${slot}`;
  }
  return slot ?? '—';
}

function resolvePlate(
  session: CustomerParkingSession | null,
  vehicle: UserVehicle | null,
) {
  if (session && typeof session.vehicleId === 'object' && session.vehicleId.licensePlate) {
    return session.vehicleId.licensePlate;
  }
  return vehicle?.licensePlate ?? null;
}

/** Active parking session screen (real API — no mock content). */
export default function DriverScreen() {
  const router = useRouter();
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  useProtectedSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [defaultVehicle, setDefaultVehicle] = useState<UserVehicle | null>(null);
  const [activeSession, setActiveSession] = useState<CustomerParkingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isParked = activeSession?.status?.toUpperCase() === 'ACTIVE';
  const [elapsed, setElapsed] = useState(() => formatElapsed(activeSession?.checkInTime));

  const loadData = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const userProfile = await getMyProfile();
        setProfile(userProfile);

        const vehicles = (userProfile.vehicles ?? []).filter(
          (vehicle) => vehicle.status?.toUpperCase() !== 'INACTIVE',
        );
        const primaryVehicle = vehicles[0] ?? null;
        setDefaultVehicle(primaryVehicle);

        const session = primaryVehicle
          ? await getActiveUserParkingSession(primaryVehicle._id)
          : null;
        setActiveSession(session);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : t('Không tải được phiên gửi xe', 'Could not load parking session');
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isParked) {
      return;
    }
    setElapsed(formatElapsed(activeSession?.checkInTime));
    const timer = setInterval(() => {
      setElapsed(formatElapsed(activeSession?.checkInTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession?.checkInTime, isParked]);

  const plate = resolvePlate(activeSession, defaultVehicle);

  if (isLoading && !profile) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={DesignColors.primary} size="large" />
        <ThemedText style={styles.loadingText}>
          {t('Đang tải phiên...', 'Loading session...')}
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
          <ThemedText style={styles.title}>{t('Phiên gửi xe', 'Parking session')}</ThemedText>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        <View style={styles.card}>
          <ThemedText style={styles.caption}>
            {t('Xin chào', 'Welcome')}, {profile?.fullName ?? t('Khách hàng', 'Customer')}
          </ThemedText>
          {plate ? (
            <ThemedText style={styles.plate}>{plate}</ThemedText>
          ) : (
            <ThemedText style={styles.muted}>
              {t('Chưa có xe đăng ký', 'No registered vehicle')}
            </ThemedText>
          )}

          {isParked ? (
            <View style={styles.sessionBlock}>
              <View style={styles.sessionHeader}>
                <View style={styles.activeBadge}>
                  <ThemedText style={styles.activeBadgeText}>
                    {t('Đang gửi', 'Parked')}
                  </ThemedText>
                </View>
                <ThemedText style={styles.slotLabel}>{resolveSlotLabel(activeSession)}</ThemedText>
              </View>
              <ThemedText style={styles.timer}>{elapsed}</ThemedText>
              <ThemedText style={styles.muted}>
                {t('Thời gian từ lúc check-in', 'Time since check-in')}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.emptyBlock}>
              <Ionicons name="car-outline" size={28} color={DesignColors.inkSubtle} />
              <ThemedText style={styles.emptyTitle}>
                {t('Chưa có phiên gửi xe', 'No active session')}
              </ThemedText>
              <ThemedText style={styles.muted}>
                {t(
                  'Khi xe đã check-in, thời gian và chỗ đỗ sẽ hiện tại đây.',
                  'When your vehicle is checked in, time and slot appear here.',
                )}
              </ThemedText>
            </View>
          )}
        </View>

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
    card: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    caption: {
      ...Typography.bodySm,
      color: DesignColors.inkSubtle,
    },
    plate: {
      ...Typography.mono,
      fontSize: 20,
      color: DesignColors.ink,
      letterSpacing: 0.6,
    },
    muted: {
      ...Typography.body,
      color: DesignColors.inkMuted,
    },
    sessionBlock: {
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
      paddingTop: Spacing.md,
      gap: Spacing.sm,
    },
    sessionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    activeBadge: {
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.semanticSuccess,
      backgroundColor: `${DesignColors.semanticSuccess}18`,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    activeBadgeText: {
      ...Typography.bodySm,
      color: DesignColors.semanticSuccess,
      fontWeight: '600',
    },
    slotLabel: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    timer: {
      ...Typography.metricValue,
      color: DesignColors.ink,
    },
    emptyBlock: {
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.lg,
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
      minHeight: 52,
      justifyContent: 'center',
    },
    primaryButtonText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
    },
    secondaryButton: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface1,
      paddingVertical: 14,
      alignItems: 'center',
      minHeight: 52,
      justifyContent: 'center',
    },
    secondaryButtonText: {
      ...Typography.button,
      color: DesignColors.ink,
    },
    pressed: {
      opacity: 0.85,
    },
  });
