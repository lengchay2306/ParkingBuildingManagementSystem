import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Typography } from '@/constants/design';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';

type StaffStatusBadgeProps = {
  label: string;
  tone?: 'active' | 'available' | 'occupied' | 'reserved' | 'exited' | 'neutral';
};

export function StaffStatusBadge({ label, tone = 'neutral' }: StaffStatusBadgeProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const palette =
    tone === 'active' || tone === 'available'
      ? {
          bg: 'rgba(52,211,153,0.12)',
          border: 'rgba(52,211,153,0.35)',
          text: DesignColors.accentEmerald,
        }
      : tone === 'reserved'
        ? {
            bg: 'rgba(96,165,250,0.14)',
            border: 'rgba(96,165,250,0.40)',
            text: DesignColors.accentSky,
          }
        : tone === 'occupied' || tone === 'exited'
          ? {
              bg: 'rgba(251,146,60,0.12)',
              border: 'rgba(251,146,60,0.35)',
              text: DesignColors.accentAmber,
            }
          : {
              bg: DesignColors.surface3,
              border: DesignColors.hairlineStrong,
              text: DesignColors.inkMuted,
            };

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <ThemedText style={[styles.text, { color: palette.text }]}>{label}</ThemedText>
    </View>
  );
}

function createStyles(_DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    badge: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    text: {
      ...Typography.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontSize: 10,
    },
  });
}
