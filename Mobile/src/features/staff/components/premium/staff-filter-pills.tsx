import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';

export type StaffFilterOption<T extends string> = {
  id: T;
  label: string;
};

type StaffFilterPillsProps<T extends string> = {
  options: StaffFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function StaffFilterPills<T extends string>({
  options,
  value,
  onChange,
}: StaffFilterPillsProps<T>) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.pill,
              active && styles.pillActive,
              pressed && styles.pillPressed,
            ]}>
            <ThemedText style={[styles.pillText, active && styles.pillTextActive]}>
              {option.label}
            </ThemedText>
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
    pill: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
    },
    pillActive: {
      borderColor: DesignColors.primary,
      backgroundColor: `${DesignColors.primary}22`,
    },
    pillPressed: {
      opacity: 0.88,
    },
    pillText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontWeight: '500',
    },
    pillTextActive: {
      color: DesignColors.primary,
      fontWeight: '700',
    },
  });
}
