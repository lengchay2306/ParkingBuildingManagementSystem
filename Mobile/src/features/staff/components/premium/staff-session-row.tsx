import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { StaffStatusBadge } from '@/features/staff/components/premium/staff-status-badge';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { StaffPressableScale } from '@/features/staff/motion/staff-motion';

type StaffSessionRowProps = {
  plate: string;
  slotLabel: string;
  timeLabel: string;
  status: string;
  onPress?: () => void;
};

export function StaffSessionRow({
  plate,
  slotLabel,
  timeLabel,
  status,
  onPress,
}: StaffSessionRowProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const isActive = status.toUpperCase() === 'ACTIVE';

  return (
    <StaffPressableScale disabled={!onPress} onPress={onPress} scaleTo={0.985} style={styles.row}>
      <View style={styles.left}>
        <ThemedText style={styles.plate}>{plate}</ThemedText>
        <View style={styles.metaRow}>
          <Ionicons
            color={isActive ? DesignColors.accentEmerald : DesignColors.accentAmber}
            name="ellipse"
            size={8}
          />
          <ThemedText style={styles.slot}>{slotLabel}</ThemedText>
        </View>
      </View>
      <View style={styles.right}>
        <StaffStatusBadge label={status} tone={isActive ? 'active' : 'exited'} />
        <ThemedText style={styles.time}>{timeLabel}</ThemedText>
      </View>
    </StaffPressableScale>
  );
}

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      minHeight: 72,
    },
    left: {
      flex: 1,
      gap: 6,
    },
    plate: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    slot: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
    right: {
      alignItems: 'flex-end',
      gap: 6,
    },
    time: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
  });
}
