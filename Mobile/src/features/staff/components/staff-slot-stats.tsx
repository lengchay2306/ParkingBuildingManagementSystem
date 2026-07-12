import React, { useMemo } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';

type StaffSlotStatsProps = {
  available: number;
  inUsed: number;
  total: number;
  labels: {
    available: string;
    inUsed: string;
    total: string;
  };
};

export function StaffSlotStats({ available, inUsed, total, labels }: StaffSlotStatsProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);

  return (
    <View style={styles.metricRow}>
      <View style={[styles.metricBadge, styles.metricBadgeAvailable]}>
        <ThemedText style={styles.metricLabel}>{labels.available}</ThemedText>
        <ThemedText style={[styles.metricValue, styles.metricValueAvailable]}>{available}</ThemedText>
      </View>
      <View style={[styles.metricBadge, styles.metricBadgeInUse]}>
        <ThemedText style={styles.metricLabel}>{labels.inUsed}</ThemedText>
        <ThemedText style={[styles.metricValue, styles.metricValueInUse]}>{inUsed}</ThemedText>
      </View>
      <View style={[styles.metricBadge, styles.metricBadgeTotal]}>
        <ThemedText style={styles.metricLabel}>{labels.total}</ThemedText>
        <ThemedText style={[styles.metricValue, styles.metricValueTotal]}>{total}</ThemedText>
      </View>
    </View>
  );
}
