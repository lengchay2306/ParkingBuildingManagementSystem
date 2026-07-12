import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';

export type StaffDetailCell = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

type StaffSessionDetailGridProps = {
  cells: StaffDetailCell[];
};

export function StaffSessionDetailGrid({ cells }: StaffSessionDetailGridProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <View style={styles.grid}>
      {cells.map((cell) => (
        <View key={cell.id} style={styles.cell}>
          <Ionicons color={DesignColors.inkSubtle} name={cell.icon} size={16} />
          <ThemedText style={styles.label}>{cell.label}</ThemedText>
          <ThemedText style={styles.value}>{cell.value}</ThemedText>
        </View>
      ))}
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    cell: {
      width: '47%',
      maxWidth: '48%',
      backgroundColor: DesignColors.surface2,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      gap: 6,
      minHeight: 88,
    },
    label: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontSize: 10,
    },
    value: {
      ...Typography.body,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 16,
    },
  });
}
