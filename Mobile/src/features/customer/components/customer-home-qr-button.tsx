import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';

type Props = {
  onPress: () => void;
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

/** Nút QR / thanh toán nổi bật với hiệu ứng pulse thu hút. */
export function CustomerHomeQrButton({ onPress, t, DesignColors }: Props) {
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const pulse = useSharedValue(0);
  const breathe = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [breathe, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.28 }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.pulseRing, ringStyle]} />
      <Animated.View style={buttonStyle}>
        <ScalePressable onPress={onPress} style={styles.button} scaleTo={0.94}>
          <View style={styles.iconCircle}>
            <Ionicons name="qr-code" size={28} color={DesignColors.onPrimary} />
          </View>
          <View style={styles.textBlock}>
            <ThemedText style={styles.title}>
              {t('Quét mã QR / Thanh toán', 'Scan QR / Pay')}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {t('Ra vào cổng nhanh chóng', 'Fast gate entry & exit')}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={DesignColors.onPrimary} />
        </ScalePressable>
      </Animated.View>
    </View>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xs,
    },
    pulseRing: {
      position: 'absolute',
      width: '100%',
      height: 72,
      borderRadius: Radius.xl,
      backgroundColor: DesignColors.primary,
    },
    button: {
      width: '100%',
      minHeight: 72,
      borderRadius: Radius.xl,
      backgroundColor: DesignColors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      shadowColor: DesignColors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
      elevation: 6,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: Radius.lg,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    textBlock: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...Typography.cardTitle,
      color: DesignColors.onPrimary,
    },
    subtitle: {
      ...Typography.caption,
      color: 'rgba(255,255,255,0.82)',
    },
  });
