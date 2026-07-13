import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedLoader } from '@/components/animated-loader';
import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import type { ParkingFloor } from '@/features/customer/api/parking';
import { FloorSlotsPanel } from '@/features/customer/components/floor-slots-panel';
import { CUSTOMER_ROUTES } from '@/roles';

type Props = {
  floors: ParkingFloor[];
  isLoading: boolean;
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

function createFloorPanelStyles(DesignColors: DesignColorPalette) {
  return {
    floorList: {
      gap: Spacing.sm,
    },
    floorBlock: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      overflow: 'hidden' as const,
    },
    floorHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    buttonPressed: {
      opacity: 0.82,
    },
    floorHeaderText: {
      flex: 1,
      gap: 4,
    },
    floorName: {
      ...Typography.body,
      color: DesignColors.ink,
      fontWeight: '600' as const,
    },
    floorStats: {
      ...Typography.bodySm,
      color: DesignColors.inkSubtle,
    },
    slotGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: Spacing.xs,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
    },
    slotChip: {
      minWidth: 48,
      borderRadius: Radius.md,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      alignItems: 'center' as const,
    },
    slotAvailable: {
      borderColor: DesignColors.semanticSuccess,
      backgroundColor: `${DesignColors.semanticSuccess}14`,
    },
    slotInUse: {
      borderColor: DesignColors.primary,
      backgroundColor: `${DesignColors.primary}14`,
    },
    slotReserved: {
      borderColor: DesignColors.semanticWarning,
      backgroundColor: `${DesignColors.semanticWarning}18`,
    },
    slotUnavailable: {
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      opacity: 0.55,
    },
    slotChipActive: {},
    slotChipDisabled: {},
    slotChipText: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '600' as const,
    },
    slotChipTextActive: {},
    slotChipTextDisabled: {
      color: DesignColors.inkMuted,
    },
  };
}

/** Sơ đồ chỗ trống theo tầng — dữ liệu thời gian thực từ API parking slots. */
export function CustomerHomeSlotsSection({ floors, isLoading, t, DesignColors }: Props) {
  const router = useRouter();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const panelStyles = useMemo(() => createFloorPanelStyles(DesignColors), [DesignColors]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText style={styles.eyebrow}>{t('Thời gian thực', 'Live')}</ThemedText>
          <ThemedText style={styles.title}>{t('Chỗ đỗ trống', 'Available spots')}</ThemedText>
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

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: `${DesignColors.semanticSuccess}33`,
                borderColor: DesignColors.semanticSuccess,
              },
            ]}
          />
          <ThemedText style={styles.legendText}>{t('Trống', 'Free')}</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: `${DesignColors.primary}22`,
                borderColor: DesignColors.primary,
              },
            ]}
          />
          <ThemedText style={styles.legendText}>{t('Đang dùng', 'In use')}</ThemedText>
        </View>
      </View>

      {isLoading ? (
        <AnimatedLoader color={DesignColors.primary} size="small" style={styles.loader} />
      ) : floors.length === 0 ? (
        <ThemedText style={styles.emptyText}>{t('Không có dữ liệu bãi đỗ', 'No parking data')}</ThemedText>
      ) : (
        <FloorSlotsPanel floors={floors} t={t} styles={panelStyles} DesignColors={DesignColors} />
      )}
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
    legendRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      flexWrap: 'wrap',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 3,
      borderWidth: 1,
    },
    legendText: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
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
