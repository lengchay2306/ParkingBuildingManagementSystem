import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedLoader } from '@/components/animated-loader';
import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import type { ParkingFloor } from '@/features/customer/api/parking';
import { CUSTOMER_ROUTES } from '@/roles';

type Props = {
  floors: ParkingFloor[];
  isLoading: boolean;
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

/** Compact live availability by floor — mirrors FE parking overview without dense slot grids. */
export function CustomerHomeSlotsSection({ floors, isLoading, t, DesignColors }: Props) {
  const router = useRouter();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const totals = useMemo(() => {
    return floors.reduce(
      (acc, floor) => {
        acc.available += floor.slotStats?.available ?? 0;
        acc.reserved += floor.slotStats?.reserved ?? 0;
        acc.inUsed += floor.slotStats?.inUsed ?? 0;
        acc.total += floor.slotStats?.total ?? floor.slots.length;
        return acc;
      },
      { available: 0, reserved: 0, inUsed: 0, total: 0 },
    );
  }, [floors]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText style={styles.eyebrow}>{t('Thời gian thực', 'Live')}</ThemedText>
          <ThemedText style={styles.title}>{t('Tình trạng bãi', 'Lot status')}</ThemedText>
        </View>
        <ScalePressable
          onPress={() => router.push(CUSTOMER_ROUTES.parkingMap as never)}
          style={styles.mapLink}
          scaleTo={0.95}
        >
          <Ionicons name="map-outline" size={14} color={DesignColors.primary} />
          <ThemedText style={styles.mapLinkText}>{t('Bản đồ 3D', '3D map')}</ThemedText>
        </ScalePressable>
      </View>

      <View style={styles.summaryRow}>
        <SummaryStat
          label={t('Trống', 'Free')}
          value={totals.available}
          color={DesignColors.semanticSuccess}
          styles={styles}
        />
        <SummaryStat
          label={t('Đã đặt', 'Reserved')}
          value={totals.reserved}
          color={DesignColors.semanticWarning}
          styles={styles}
        />
        <SummaryStat
          label={t('Đang dùng', 'In use')}
          value={totals.inUsed}
          color={DesignColors.accentSky}
          styles={styles}
        />
      </View>

      {isLoading ? (
        <AnimatedLoader color={DesignColors.primary} size="small" style={styles.loader} />
      ) : floors.length === 0 ? (
        <ThemedText style={styles.emptyText}>
          {t('Không có dữ liệu bãi đỗ', 'No parking data')}
        </ThemedText>
      ) : (
        <View style={styles.floorList}>
          {floors.map((floor) => {
            const available = floor.slotStats?.available ?? 0;
            const total = floor.slotStats?.total ?? floor.slots.length;
            const ratio = total > 0 ? available / total : 0;
            return (
              <View key={floor._id} style={styles.floorRow}>
                <View style={styles.floorMeta}>
                  <ThemedText style={styles.floorName} numberOfLines={1}>
                    {floor.floorName}
                  </ThemedText>
                  <ThemedText style={styles.floorType}>
                    {floor.vehicleType?.type ?? '—'}
                  </ThemedText>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.round(ratio * 100)}%`,
                        backgroundColor:
                          ratio > 0.4
                            ? DesignColors.semanticSuccess
                            : ratio > 0.15
                              ? DesignColors.semanticWarning
                              : DesignColors.semanticDanger,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.floorCount}>
                  {available}/{total}
                </ThemedText>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function SummaryStat({
  label,
  value,
  color,
  styles,
}: {
  label: string;
  value: number;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.summaryChip}>
      <ThemedText style={[styles.summaryValue, { color }]}>{value}</ThemedText>
      <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
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
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    headerText: {
      flex: 1,
      gap: 4,
    },
    eyebrow: {
      ...Typography.eyebrow,
      color: DesignColors.primary,
      textTransform: 'uppercase',
    },
    title: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    mapLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
    },
    mapLinkText: {
      ...Typography.bodySm,
      color: DesignColors.primary,
      fontWeight: '600',
    },
    summaryRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    summaryChip: {
      flex: 1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      gap: 2,
    },
    summaryValue: {
      ...Typography.cardTitle,
    },
    summaryLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    floorList: {
      gap: Spacing.sm,
    },
    floorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    floorMeta: {
      width: 88,
      gap: 1,
    },
    floorName: {
      ...Typography.caption,
      color: DesignColors.ink,
      fontWeight: '600',
    },
    floorType: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 10,
    },
    barTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: DesignColors.surface2,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 4,
    },
    floorCount: {
      ...Typography.mono,
      fontSize: 11,
      lineHeight: 14,
      color: DesignColors.inkMuted,
      width: 44,
      textAlign: 'right',
    },
    loader: {
      marginVertical: Spacing.md,
    },
    emptyText: {
      ...Typography.body,
      color: DesignColors.inkMuted,
      textAlign: 'center',
      paddingVertical: Spacing.md,
    },
  });
