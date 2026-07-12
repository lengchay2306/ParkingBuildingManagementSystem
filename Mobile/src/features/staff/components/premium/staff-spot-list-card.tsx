import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { StaffPressableScale } from '@/features/staff/motion/staff-motion';

type StaffSpotListCardProps = {
  title: string;
  subtitle: string;
  statusLabel: string;
  timestamp?: string;
  tone: 'available' | 'occupied' | 'unavailable';
  onPress?: () => void;
};

export function StaffSpotListCard({
  title,
  subtitle,
  statusLabel,
  timestamp,
  tone,
  onPress,
}: StaffSpotListCardProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const dotColor =
    tone === 'available'
      ? DesignColors.accentEmerald
      : tone === 'occupied'
        ? DesignColors.accentAmber
        : DesignColors.inkSubtle;

  const accentBorder =
    tone === 'available' ? DesignColors.accentEmerald : tone === 'occupied' ? DesignColors.accentAmber : 'transparent';

  return (
    <StaffPressableScale
      disabled={!onPress}
      onPress={onPress}
      scaleTo={0.985}
      style={[styles.card, { borderLeftColor: accentBorder }]}>
      <View style={styles.left}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
      </View>
      <View style={styles.right}>
        <View style={styles.statusRow}>
          <Ionicons color={dotColor} name="ellipse" size={8} />
          <ThemedText style={[styles.status, { color: dotColor }]}>{statusLabel}</ThemedText>
        </View>
        {timestamp ? <ThemedText style={styles.time}>{timestamp}</ThemedText> : null}
      </View>
    </StaffPressableScale>
  );
}

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      borderLeftWidth: 3,
      padding: Spacing.md,
      minHeight: 72,
      shadowColor: DesignColors.semanticOverlay,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 1,
    },
    left: {
      flex: 1,
      gap: 4,
    },
    title: {
      ...Typography.body,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 17,
      letterSpacing: 0.3,
    },
    subtitle: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
    right: {
      alignItems: 'flex-end',
      gap: 4,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    status: {
      ...Typography.caption,
      fontWeight: '600',
      fontSize: 11,
    },
    time: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 10,
    },
  });
}
