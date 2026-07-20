import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import type { CustomerParkingSession } from '@/features/customer/api/parking';
import { CUSTOMER_ROUTES } from '@/roles';
import { formatDbStatus } from '@/lib/db-status';

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
    return null;
  }
  const floor = session.parkingSlotId.floorId?.floorName;
  const slot = session.parkingSlotId.slotNumber;
  if (floor && slot) {
    return `${floor} · ${slot}`;
  }
  return slot ?? null;
}

function resolveSessionPlate(session: CustomerParkingSession | null) {
  if (!session || typeof session.vehicleId !== 'object') {
    return null;
  }
  return session.vehicleId.licensePlate ?? null;
}

type Props = {
  fullName: string;
  status?: string | null;
  email?: string | null;
  activeSession: CustomerParkingSession | null;
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

/** FE-style profile hero: avatar, name, status + live session strip when parked. */
export function CustomerHomeOverviewCard({
  fullName,
  status,
  email,
  activeSession,
  t,
  DesignColors,
}: Props) {
  const router = useRouter();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const isParked = activeSession?.status?.toUpperCase() === 'ACTIVE';
  const [elapsed, setElapsed] = useState(() => formatElapsed(activeSession?.checkInTime));
  const sessionPlate = resolveSessionPlate(activeSession);
  const slotLabel = resolveSlotLabel(activeSession);
  const statusLabel = formatDbStatus(status, 'ACTIVE');
  const isActiveStatus = statusLabel === 'ACTIVE';

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
    <View style={styles.wrap}>
      <ScalePressable
        onPress={() => router.push(CUSTOMER_ROUTES.profile as never)}
        style={styles.hero}
        scaleTo={0.985}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={DesignColors.inkMuted} />
          </View>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isActiveStatus
                  ? DesignColors.semanticSuccess
                  : DesignColors.inkSubtle,
              },
            ]}
          />
        </View>

        <View style={styles.heroText}>
          <ThemedText style={styles.caption}>{t('Cổng tài xế', 'Driver portal')}</ThemedText>
          <ThemedText style={styles.name} numberOfLines={1}>
            {fullName}
          </ThemedText>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.statusPill,
                {
                  borderColor: isActiveStatus
                    ? `${DesignColors.semanticSuccess}66`
                    : DesignColors.hairlineStrong,
                  backgroundColor: isActiveStatus
                    ? `${DesignColors.semanticSuccess}18`
                    : DesignColors.surface2,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.statusPillText,
                  {
                    color: isActiveStatus
                      ? DesignColors.semanticSuccess
                      : DesignColors.inkSubtle,
                  },
                ]}
              >
                {statusLabel}
              </ThemedText>
            </View>
            {email ? (
              <ThemedText style={styles.email} numberOfLines={1}>
                {email}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color={DesignColors.inkSubtle} />
      </ScalePressable>

      {isParked ? (
        <ScalePressable
          onPress={() => router.push(CUSTOMER_ROUTES.driver as never)}
          style={styles.sessionStrip}
          scaleTo={0.98}
        >
          <View style={styles.sessionLeft}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <ThemedText style={styles.liveText}>{t('Đang trong bãi', 'Parked')}</ThemedText>
            </View>
            {sessionPlate ? (
              <ThemedText style={styles.sessionPlate}>{sessionPlate}</ThemedText>
            ) : null}
            {slotLabel ? (
              <ThemedText style={styles.sessionSlot}>{slotLabel}</ThemedText>
            ) : null}
          </View>
          <View style={styles.sessionRight}>
            <ThemedText style={styles.timer}>{elapsed}</ThemedText>
            <ThemedText style={styles.timerHint}>{t('Thời gian gửi', 'Parked for')}</ThemedText>
          </View>
        </ScalePressable>
      ) : null}
    </View>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    wrap: {
      gap: Spacing.sm,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: `${DesignColors.primary}33`,
      backgroundColor: DesignColors.surface1,
      padding: Spacing.md,
      overflow: 'hidden',
    },
    avatarWrap: {
      position: 'relative',
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusDot: {
      position: 'absolute',
      right: 2,
      bottom: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: DesignColors.surface1,
    },
    heroText: {
      flex: 1,
      gap: 4,
      minWidth: 0,
    },
    caption: {
      ...Typography.eyebrow,
      color: DesignColors.inkSubtle,
      textTransform: 'uppercase',
    },
    name: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: 2,
    },
    statusPill: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    statusPillText: {
      ...Typography.caption,
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 0.6,
    },
    email: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      flex: 1,
    },
    sessionStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: `${DesignColors.semanticSuccess}44`,
      backgroundColor: `${DesignColors.semanticSuccess}12`,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    sessionLeft: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    livePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: DesignColors.semanticSuccess,
    },
    liveText: {
      ...Typography.caption,
      color: DesignColors.semanticSuccess,
      fontWeight: '700',
    },
    sessionPlate: {
      ...Typography.mono,
      fontSize: 15,
      lineHeight: 20,
      color: DesignColors.ink,
    },
    sessionSlot: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
    sessionRight: {
      alignItems: 'flex-end',
      gap: 2,
    },
    timer: {
      ...Typography.subhead,
      fontFamily: Typography.mono.fontFamily,
      color: DesignColors.ink,
      letterSpacing: 0.5,
    },
    timerHint: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
  });
