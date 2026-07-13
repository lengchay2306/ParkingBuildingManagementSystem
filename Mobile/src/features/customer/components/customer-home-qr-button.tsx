import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';

type Props = {
  onPress: () => void;
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

/** Session CTA — opens active session screen. */
export function CustomerHomeQrButton({ onPress, t, DesignColors }: Props) {
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <ScalePressable onPress={onPress} style={styles.button} scaleTo={0.97}>
      <View style={styles.iconCircle}>
        <Ionicons name="time-outline" size={24} color={DesignColors.onPrimary} />
      </View>
      <View style={styles.textBlock}>
        <ThemedText style={styles.title}>
          {t('Phiên gửi xe', 'Parking session')}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {t('Xem chỗ đỗ và thời gian đang gửi', 'View slot and parking time')}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={DesignColors.onPrimary} />
    </ScalePressable>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    button: {
      width: '100%',
      borderRadius: Radius.lg,
      backgroundColor: DesignColors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      minHeight: 68,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    textBlock: {
      flex: 1,
      gap: 4,
    },
    title: {
      ...Typography.button,
      color: DesignColors.onPrimary,
    },
    subtitle: {
      ...Typography.bodySm,
      color: 'rgba(255,255,255,0.85)',
    },
  });
