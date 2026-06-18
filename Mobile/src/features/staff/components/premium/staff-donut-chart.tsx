import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';

type StaffDonutChartProps = {
  value: number;
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
};

export function StaffDonutChart({
  value,
  label,
  sublabel,
  size = 168,
  strokeWidth = 14,
}: StaffDonutChartProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (clamped / 100) * circumference;

  return (
    <View style={styles.wrap}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={DesignColors.surface3}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
          stroke={DesignColors.primary}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
      <View style={styles.center}>
        <ThemedText style={styles.value}>{Math.round(clamped)}%</ThemedText>
        <ThemedText style={styles.label}>{label}</ThemedText>
        {sublabel ? <ThemedText style={styles.sublabel}>{sublabel}</ThemedText> : null}
      </View>
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    value: {
      ...Typography.metricValue,
      color: DesignColors.ink,
      fontSize: 32,
      fontWeight: '700',
    },
    label: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontSize: 10,
    },
    sublabel: {
      ...Typography.caption,
      color: DesignColors.accentEmerald,
      fontSize: 11,
      fontWeight: '600',
    },
  });
}
