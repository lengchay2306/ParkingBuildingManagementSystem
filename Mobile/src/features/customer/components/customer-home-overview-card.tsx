import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import type { CustomerParkingSession } from '@/features/customer/api/parking';
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

function resolveSessionPlate(session: CustomerParkingSession | null) {
  if (!session || typeof session.vehicleId !== 'object') {
    return null;
  }
  return session.vehicleId.licensePlate ?? null;
}

type Props = {
  fullName: string;
  vehicleCount: number;
  pendingReservationCount: number;
  freeSpotCount: number;
  activeSession: CustomerParkingSession | null;
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

/**
 * Home status card: greeting + parked session (or outside tip) + useful counts.
 * No plate-chip picker — that added noise without a clear job.
 */
export function CustomerHomeOverviewCard({
  fullName,
  vehicleCount,
  pendingReservationCount,
  freeSpotCount,
  activeSession,
  t,
  DesignColors,
}: Props) {
  const router = useRouter();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const isParked = activeSession?.status?.toUpperCase() === 'ACTIVE';
  const [elapsed, setElapsed] = useState(() => formatElapsed(activeSession?.checkInTime));
  const sessionPlate = resolveSessionPlate(activeSession);

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

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText style={styles.caption}>{t('Xin chào', 'Welcome')}</ThemedText>
        <ThemedText style={styles.name}>{fullName}</ThemedText>
      </View>

      {isParked ? (
        <View style={styles.activeSession}>
          <View style={styles.activeHeader}>
            <View style={styles.statusPillParked}>
              <View style={styles.dotParked} />
              <ThemedText style={styles.statusTextParked}>
                {t('Đang trong bãi', 'Parked')}
              </ThemedText>
            </View>
            <ThemedText style={styles.activeSlot}>{resolveSlotLabel(activeSession)}</ThemedText>
          </View>
          {sessionPlate ? (
            <ThemedText style={styles.sessionPlate}>{sessionPlate}</ThemedText>
          ) : null}
          <ThemedText style={styles.activeTimer}>{elapsed}</ThemedText>
          <ThemedText style={styles.activeHint}>
            {t('Thời gian gửi từ lúc check-in', 'Time since check-in')}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.outsideBlock}>
          <View style={styles.statusPillOutside}>
            <View style={styles.dotOutside} />
            <ThemedText style={styles.statusTextOutside}>
              {t('Ngoài bãi', 'Outside')}
            </ThemedText>
          </View>
          <ThemedText style={styles.outsideHint}>
            {vehicleCount === 0
              ? t(
                  'Chưa có xe. Vào Hồ sơ để đăng ký biển số.',
                  'No vehicles yet. Register a plate in Profile.',
                )
              : t(
                  'Chưa có phiên gửi xe. Đặt chỗ trước hoặc xem bản đồ khi đến bãi.',
                  'No active parking session. Reserve ahead or open the map when you arrive.',
                )}
          </ThemedText>
        </View>
      )}

      <View style={styles.statsRow}>
        <Pressable
          onPress={() => router.push(CUSTOMER_ROUTES.profile as never)}
          style={({ pressed }) => [styles.statChip, pressed && styles.pressed]}
        >
          <ThemedText style={styles.statValue}>{vehicleCount}</ThemedText>
          <ThemedText style={styles.statLabel}>{t('Xe', 'Vehicles')}</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push(CUSTOMER_ROUTES.reservations as never)}
          style={({ pressed }) => [styles.statChip, pressed && styles.pressed]}
        >
          <ThemedText style={styles.statValue}>{pendingReservationCount}</ThemedText>
          <ThemedText style={styles.statLabel}>{t('Đang giữ chỗ', 'On hold')}</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push(CUSTOMER_ROUTES.parkingMap as never)}
          style={({ pressed }) => [styles.statChip, pressed && styles.pressed]}
        >
          <ThemedText style={[styles.statValue, { color: DesignColors.semanticSuccess }]}>
            {freeSpotCount}
          </ThemedText>
          <ThemedText style={styles.statLabel}>{t('Chỗ trống', 'Free')}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    headerRow: {
      gap: 4,
    },
    caption: {
      ...Typography.bodySm,
      color: DesignColors.inkSubtle,
    },
    name: {
      ...Typography.headline,
      color: DesignColors.ink,
    },
    activeSession: {
      gap: 6,
    },
    activeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    statusPillParked: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: DesignColors.semanticSuccess,
      backgroundColor: `${DesignColors.semanticSuccess}18`,
    },
    statusTextParked: {
      ...Typography.bodySm,
      fontWeight: '600',
      color: DesignColors.ink,
    },
    dotParked: {
      width: 8,
      height: 8,
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.semanticSuccess,
    },
    activeSlot: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    sessionPlate: {
      ...Typography.mono,
      fontSize: 16,
      color: DesignColors.ink,
      letterSpacing: 0.4,
    },
    activeTimer: {
      ...Typography.metricValue,
      color: DesignColors.ink,
    },
    activeHint: {
      ...Typography.bodySm,
      color: DesignColors.inkSubtle,
    },
    outsideBlock: {
      gap: Spacing.sm,
    },
    statusPillOutside: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
    },
    statusTextOutside: {
      ...Typography.bodySm,
      fontWeight: '600',
      color: DesignColors.ink,
    },
    dotOutside: {
      width: 8,
      height: 8,
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.inkMuted,
    },
    outsideHint: {
      ...Typography.body,
      color: DesignColors.inkMuted,
    },
    statsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    statChip: {
      flex: 1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    statLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textAlign: 'center',
    },
    pressed: {
      opacity: 0.85,
    },
  });
