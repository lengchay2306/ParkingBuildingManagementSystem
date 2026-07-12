import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import type { SpotStatusFilter } from '@/features/staff/lib/parking-slot-filters';
import type { StaffSpotCounts } from '@/features/staff/lib/staff-spots-filter';

type StaffSpotStatusBarProps = {
  counts: StaffSpotCounts;
  value: SpotStatusFilter;
  onChange: (value: SpotStatusFilter) => void;
  t: (vi: string, en: string) => string;
};

type StatusChip = {
  id: SpotStatusFilter;
  label: string;
  count: number;
  color: string;
};

export function StaffSpotStatusBar({ counts, value, onChange, t }: StaffSpotStatusBarProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const chips = useMemo<StatusChip[]>(
    () => [
      {
        id: 'ALL',
        label: t('Tất cả', 'All'),
        count: counts.total,
        color: DesignColors.primary,
      },
      {
        id: 'AVAILABLE',
        label: t('Trống', 'Free'),
        count: counts.available,
        color: DesignColors.accentEmerald,
      },
      {
        id: 'CURRENTLY-IN-USED',
        label: t('Đang gửi', 'In use'),
        count: counts.inUsed,
        color: DesignColors.accentAmber,
      },
      {
        id: 'RESERVED',
        label: t('Đã đặt', 'Reserved'),
        count: counts.reserved,
        color: DesignColors.accentSky,
      },
      {
        id: 'UNAVAILABLE',
        label: t('Khóa', 'Locked'),
        count: counts.unavailable,
        color: DesignColors.inkSubtle,
      },
    ],
    [DesignColors, counts, t],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}>
      {chips.map((chip) => {
        const active = chip.id === value;
        return (
          <Pressable
            key={chip.id}
            onPress={() => onChange(chip.id)}
            style={({ pressed }) => [
              styles.chip,
              active && { borderColor: chip.color, backgroundColor: `${chip.color}18` },
              pressed && styles.chipPressed,
            ]}>
            <ThemedText style={[styles.count, active && { color: chip.color }]}>{chip.count}</ThemedText>
            <ThemedText style={[styles.label, active && styles.labelActive]}>{chip.label}</ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: Spacing.xs,
      paddingVertical: 2,
    },
    chip: {
      minWidth: 64,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      alignItems: 'center',
      gap: 2,
    },
    chipPressed: {
      opacity: 0.88,
    },
    count: {
      ...Typography.metricValue,
      fontSize: 18,
      lineHeight: 22,
      color: DesignColors.ink,
    },
    label: {
      ...Typography.caption,
      fontSize: 10,
      color: DesignColors.inkMuted,
      fontWeight: '500',
    },
    labelActive: {
      color: DesignColors.ink,
      fontWeight: '700',
    },
  });
}
