import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';

type StaffScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onProfilePress?: () => void;
  rightLabel?: string;
};

export function StaffScreenHeader({
  title,
  subtitle,
  onProfilePress,
  rightLabel,
}: StaffScreenHeaderProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
      </View>
      {onProfilePress ? (
        <Pressable
          onPress={onProfilePress}
          style={({ pressed }) => [styles.profileBtn, pressed && { opacity: 0.85 }]}>
          <Ionicons color={DesignColors.ink} name="person-circle-outline" size={28} />
          {rightLabel ? <ThemedText style={styles.rightLabel}>{rightLabel}</ThemedText> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    textBlock: {
      flex: 1,
      gap: 4,
    },
    title: {
      ...Typography.pageTitle,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 26,
    },
    subtitle: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    profileBtn: {
      alignItems: 'center',
      gap: 2,
    },
    rightLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 10,
    },
  });
}
