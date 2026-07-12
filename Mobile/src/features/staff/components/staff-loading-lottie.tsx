import { DotLottie } from '@lottiefiles/dotlottie-react-native';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { staffRevealEntering, staffRevealExiting } from '@/features/staff/motion/staff-motion';

const LOADING_LOTTIE = require('@/components/gif/loading.lottie');

type StaffLoadingLottieProps = {
  /** Visual size of the animation square. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Fade on mount & unmount. Disable for tiny inline spinners. */
  animate?: boolean;
};

export function StaffLoadingLottie({ size = 112, style, animate = true }: StaffLoadingLottieProps) {
  const lottie = (
    <View style={[styles.wrap, style]}>
      <DotLottie autoplay loop source={LOADING_LOTTIE} style={{ width: size, height: size }} />
    </View>
  );

  if (!animate) {
    return lottie;
  }

  return (
    <Animated.View entering={staffRevealEntering()} exiting={staffRevealExiting()} style={styles.animatedShell}>
      {lottie}
    </Animated.View>
  );
}

type StaffLoadingRevealProps = {
  loading: boolean;
  size?: number;
  loadingStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/** Crossfade from Lottie loader into content when `loading` becomes false. */
export function StaffLoadingReveal({
  loading,
  size = 112,
  loadingStyle,
  contentStyle,
  children,
}: StaffLoadingRevealProps) {
  if (loading) {
    return <StaffLoadingLottie size={size} style={loadingStyle} />;
  }

  return (
    <Animated.View entering={FadeIn.duration(280)} exiting={FadeOut.duration(180)} style={contentStyle}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedShell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
