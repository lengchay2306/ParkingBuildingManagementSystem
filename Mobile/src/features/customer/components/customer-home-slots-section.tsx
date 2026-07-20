import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedLoader } from '@/components/animated-loader';
import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import type { ParkingFloor } from '@/features/customer/api/parking';
import { resolveSlotStatusVisual } from '@/features/customer/components/floor-slots-panel';
import {
  resolveFloorPresentation,
  sortFloorsLikeParkingMap,
  sortSlotsByNumber,
} from '@/lib/parking-floor-config';
import { CUSTOMER_ROUTES } from '@/roles';

type Props = {
  floors: ParkingFloor[];
  isLoading: boolean;
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

/** Live lot status with floor tabs + slot grid (staff-like). */
export function CustomerHomeSlotsSection({ floors, isLoading, t, DesignColors }: Props) {
  const router = useRouter();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);

  const orderedFloors = useMemo(() => sortFloorsLikeParkingMap(floors), [floors]);

  useEffect(() => {
    if (orderedFloors.length === 0) {
      setActiveFloorId(null);
      return;
    }
    setActiveFloorId((current) => {
      if (current && orderedFloors.some((floor) => floor._id === current)) {
        return current;
      }
      return orderedFloors[0]._id;
    });
  }, [orderedFloors]);

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

  const activeFloor = useMemo(
    () => orderedFloors.find((floor) => floor._id === activeFloorId) ?? orderedFloors[0] ?? null,
    [activeFloorId, orderedFloors],
  );

  const activeSlots = useMemo(
    () => (activeFloor ? sortSlotsByNumber(activeFloor.slots) : []),
    [activeFloor],
  );

  const activePresentation = useMemo(
    () => (activeFloor ? resolveFloorPresentation(activeFloor, t) : null),
    [activeFloor, t],
  );

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
          label="AVAILABLE"
          value={totals.available}
          color={DesignColors.semanticSuccess}
          styles={styles}
        />
        <SummaryStat
          label="RESERVED"
          value={totals.reserved}
          color={DesignColors.semanticWarning}
          styles={styles}
        />
        <SummaryStat
          label="CURRENTLY-IN-USED"
          value={totals.inUsed}
          color={DesignColors.accentSky}
          styles={styles}
        />
      </View>

      {isLoading ? (
        <AnimatedLoader color={DesignColors.primary} size="small" style={styles.loader} />
      ) : orderedFloors.length === 0 ? (
        <ThemedText style={styles.emptyText}>
          {t('Không có dữ liệu bãi đỗ', 'No parking data')}
        </ThemedText>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.floorTabs}
          >
            {orderedFloors.map((floor) => {
              const active = floor._id === activeFloor?._id;
              const presentation = resolveFloorPresentation(floor, t);
              return (
                <Pressable
                  key={floor._id}
                  onPress={() => setActiveFloorId(floor._id)}
                  style={({ pressed }) => [
                    styles.floorTab,
                    active && styles.floorTabActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={active ? styles.floorTabTextActive : styles.floorTabText}>
                    {presentation.tabLabel}
                  </ThemedText>
                  <ThemedText style={active ? styles.floorTabBadgeActive : styles.floorTabBadge}>
                    {presentation.available}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {activeFloor && activePresentation ? (
            <View style={styles.floorBody}>
              <ThemedText style={styles.floorMeta} numberOfLines={2}>
                {activePresentation.metaTitle}
              </ThemedText>
              <ThemedText style={styles.floorStats}>
                {activePresentation.available}/{activePresentation.total} AVAILABLE ·{' '}
                {activePresentation.inUsed} CURRENTLY-IN-USED
              </ThemedText>

              <View style={styles.legendRow}>
                <LegendDot color={DesignColors.semanticSuccess} label="AVAILABLE" styles={styles} />
                <LegendDot
                  color={DesignColors.semanticWarning}
                  label="RESERVED"
                  styles={styles}
                />
                <LegendDot
                  color={DesignColors.accentSky}
                  label="CURRENTLY-IN-USED"
                  styles={styles}
                />
                <LegendDot
                  color={DesignColors.semanticDanger}
                  label="UNAVAILABLE"
                  styles={styles}
                />
              </View>

              {activeSlots.length === 0 ? (
                <ThemedText style={styles.emptyText}>
                  {t('Không có ô trên tầng này.', 'No spots on this floor.')}
                </ThemedText>
              ) : (
                <View style={styles.slotGrid}>
                  {activeSlots.map((slot) => {
                    const visual = resolveSlotStatusVisual(slot.status, DesignColors);
                    return (
                      <View key={slot._id} style={[styles.slotChip, visual.chip]}>
                        <ThemedText style={[styles.slotChipText, visual.text]} numberOfLines={1}>
                          {slot.slotNumber}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}
        </>
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
      <ThemedText style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

function LegendDot({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText style={styles.legendText}>{label}</ThemedText>
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
      paddingHorizontal: 4,
      alignItems: 'center',
      gap: 2,
    },
    summaryValue: {
      ...Typography.cardTitle,
    },
    summaryLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 8,
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    floorTabs: {
      flexDirection: 'row',
      gap: Spacing.xs,
      paddingVertical: 2,
    },
    floorTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
    },
    floorTabActive: {
      borderColor: DesignColors.primary,
      backgroundColor: `${DesignColors.primary}14`,
    },
    floorTabText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontWeight: '600',
    },
    floorTabTextActive: {
      ...Typography.caption,
      color: DesignColors.primary,
      fontWeight: '700',
    },
    floorTabBadge: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontWeight: '600',
      fontSize: 10,
    },
    floorTabBadgeActive: {
      ...Typography.caption,
      color: DesignColors.primary,
      fontWeight: '700',
      fontSize: 10,
    },
    floorBody: {
      gap: Spacing.sm,
    },
    floorMeta: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '600',
    },
    floorStats: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 9,
      letterSpacing: 0.2,
    },
    slotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    slotChip: {
      minWidth: 52,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
      borderRadius: Radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotChipText: {
      ...Typography.caption,
      fontWeight: '700',
      fontSize: 11,
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
    pressed: {
      opacity: 0.88,
    },
  });
