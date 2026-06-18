import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';

export type StaffMetricItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'info';
};

type StaffMetricGridProps = {
  items: StaffMetricItem[];
};

export function StaffMetricGrid({ items }: StaffMetricGridProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const toneColor =
          item.tone === 'success'
            ? DesignColors.accentEmerald
            : item.tone === 'warning'
              ? DesignColors.accentAmber
              : item.tone === 'info'
                ? DesignColors.accentSky
                : DesignColors.primary;

        return (
          <View key={item.id} style={styles.cell}>
            <View style={[styles.iconWrap, { backgroundColor: `${toneColor}18` }]}>
              <Ionicons color={toneColor} name={item.icon} size={18} />
            </View>
            <ThemedText style={styles.value}>{item.value}</ThemedText>
            <ThemedText style={styles.label}>{item.label}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    cell: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: DesignColors.surface2,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      gap: 4,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    value: {
      ...Typography.metricValue,
      fontSize: 24,
      color: DesignColors.ink,
    },
    label: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontSize: 11,
    },
  });
}
