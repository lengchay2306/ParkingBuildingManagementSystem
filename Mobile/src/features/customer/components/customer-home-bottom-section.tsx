import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import type { Reservation } from '@/features/customer/api/reservations';
import { ReservationCard } from '@/features/customer/components/reservation-card';
import { CUSTOMER_ROUTES } from '@/roles';

type Props = {
  reservations: Reservation[];
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

function createReservationStyles(DesignColors: DesignColorPalette) {
  return {
    reservationCard: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface1,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    reservationHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: Spacing.sm,
    },
    plateBadge: {
      borderRadius: Radius.md,
      backgroundColor: DesignColors.surface2,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    plateText: {
      ...Typography.mono,
      color: DesignColors.ink,
      letterSpacing: 0.4,
    },
    statusPill: {
      borderRadius: Radius.md,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    statusPillText: {
      ...Typography.bodySm,
      fontWeight: '600' as const,
    },
    infoRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      gap: Spacing.md,
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
      textAlign: 'right' as const,
    },
  };
}

/** Recent reservation history only (shortcuts live in tab bar / profile). */
export function CustomerHomeBottomSection({ reservations, t, DesignColors }: Props) {
  const router = useRouter();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const reservationStyles = useMemo(() => createReservationStyles(DesignColors), [DesignColors]);
  const recent = reservations.slice(0, 3);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerText}>
          <ThemedText style={styles.eyebrow}>{t('Đã đặt chỗ', 'Reservations')}</ThemedText>
          <ThemedText style={styles.sectionTitle}>
            {t('Lịch sử gần đây', 'Recent history')}
          </ThemedText>
        </View>
        <ScalePressable
          onPress={() => router.push(CUSTOMER_ROUTES.reservations as never)}
          style={styles.linkButton}
          scaleTo={0.95}
        >
          <ThemedText style={styles.linkText}>{t('Xem tất cả', 'View all')}</ThemedText>
          <Ionicons name="chevron-forward" size={14} color={DesignColors.primary} />
        </ScalePressable>
      </View>

      {recent.length === 0 ? (
        <ThemedText style={styles.emptyText}>
          {t('Chưa có lịch sử đặt chỗ', 'No reservation history yet')}
        </ThemedText>
      ) : (
        <View style={styles.list}>
          {recent.map((item) => (
            <ScalePressable
              key={item._id}
              onPress={() => router.push(CUSTOMER_ROUTES.reservations as never)}
              style={styles.historyItem}
              scaleTo={0.98}
            >
              <ReservationCard
                reservation={item}
                t={t}
                styles={reservationStyles}
                DesignColors={DesignColors}
              />
            </ScalePressable>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    section: {
      gap: Spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    eyebrow: {
      ...Typography.eyebrow,
      color: DesignColors.primary,
      textTransform: 'uppercase',
    },
    sectionTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    linkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: Spacing.xs,
      paddingVertical: 4,
    },
    linkText: {
      ...Typography.bodySm,
      color: DesignColors.primary,
      fontWeight: '600',
    },
    emptyText: {
      ...Typography.body,
      color: DesignColors.inkMuted,
      paddingVertical: Spacing.xs,
    },
    list: {
      gap: Spacing.sm,
    },
    historyItem: {
      borderRadius: Radius.lg,
    },
  });
