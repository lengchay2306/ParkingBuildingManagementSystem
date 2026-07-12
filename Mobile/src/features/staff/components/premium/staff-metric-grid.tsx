import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';

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

function resolveToneColor(
  tone: StaffMetricItem['tone'],
  DesignColors: ReturnType<typeof useStaffDesignColors>,
) {
  switch (tone) {
    case 'success':
      return DesignColors.accentEmerald;
    case 'warning':
      return DesignColors.semanticWarning;
    case 'info':
      return DesignColors.accentSky;
    default:
      return DesignColors.primary;
  }
}

export function StaffMetricGrid({ items }: StaffMetricGridProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const toneColor = resolveToneColor(item.tone, DesignColors);

        return (
          <View key={item.id} style={styles.cell}>
            <View style={styles.metricBody}>
              <View style={[styles.iconWrap, { backgroundColor: `${toneColor}1A`, borderColor: `${toneColor}33` }]}>
                <Ionicons color={toneColor} name={item.icon} size={20} />
              </View>
              <View style={styles.metricCopy}>
                <ThemedText style={[styles.value, { color: toneColor }]}>{item.value}</ThemedText>
                <ThemedText style={styles.label}>{item.label}</ThemedText>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: Spacing.md,
    },
    cell: {
      width: '48%',
      minHeight: 104,
      backgroundColor: DesignColors.surface2,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      justifyContent: 'center',
    },
    metricBody: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    metricCopy: {
      flex: 1,
      justifyContent: 'center',
      gap: 2,
      minWidth: 0,
    },
    value: {
      ...Typography.metricValue,
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      includeFontPadding: false,
    },
    label: {
      ...Typography.caption,
      color: DesignColors.ink,
      opacity: 0.82,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
    },
  });
}
