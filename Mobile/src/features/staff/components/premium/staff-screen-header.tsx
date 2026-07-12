import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/design';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';

type StaffScreenHeaderProps = {
  title: string;
  onProfilePress?: () => void;
  rightLabel?: string;
};

export function StaffScreenHeader({
  title,
  onProfilePress,
  rightLabel,
}: StaffScreenHeaderProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <ThemedText style={styles.title}>{title}</ThemedText>
      </View>
      {onProfilePress ? (
        <Pressable
          hitSlop={6}
          onPress={onProfilePress}
          style={({ pressed }) => [styles.profileBtn, pressed && styles.profileBtnPressed]}>
          <Ionicons color={DesignColors.ink} name="person-circle-outline" size={28} />
          {rightLabel ? <ThemedText style={styles.rightLabel}>{rightLabel}</ThemedText> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    textBlock: {
      flex: 1,
    },
    title: {
      ...Typography.pageTitle,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 26,
    },
    profileBtn: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    profileBtnPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
    rightLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 10,
    },
  });
}
