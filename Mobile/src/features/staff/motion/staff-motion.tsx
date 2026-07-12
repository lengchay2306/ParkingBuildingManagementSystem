import React, { useMemo } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** Single reveal effect for staff UI — soft opacity fade (no bounce / spring). */
export const STAFF_REVEAL_DURATION = 280;
export const STAFF_REVEAL_STAGGER = 40;

const revealEasing = Easing.out(Easing.cubic);
const pressTiming = { duration: 120, easing: Easing.out(Easing.quad) };

export function staffRevealEntering(delay = 0) {
  return FadeIn.delay(delay).duration(STAFF_REVEAL_DURATION).easing(revealEasing);
}

export function staffRevealExiting() {
  return FadeOut.duration(180).easing(Easing.in(Easing.cubic));
}

export function staffLayoutTransition() {
  return LinearTransition.duration(220).easing(revealEasing);
}

type StaffFadeInProps = {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  /** Layout transitions are expensive inside scroll lists — disable there. */
  animateLayout?: boolean;
};

export function StaffFadeIn({
  children,
  index = 0,
  delay = 0,
  style,
  animateLayout = false,
}: StaffFadeInProps) {
  const entering = useMemo(
    () => staffRevealEntering(delay + index * STAFF_REVEAL_STAGGER),
    [delay, index],
  );

  return (
    <Animated.View
      entering={entering}
      layout={animateLayout ? staffLayoutTransition() : undefined}
      style={style}>
      {children}
    </Animated.View>
  );
}

type StaffFadeSwitchProps = {
  children: React.ReactNode;
  switchKey: string;
  style?: StyleProp<ViewStyle>;
};

export function StaffFadeSwitch({ children, switchKey, style }: StaffFadeSwitchProps) {
  return (
    <Animated.View
      entering={staffRevealEntering()}
      exiting={staffRevealExiting()}
      key={switchKey}
      layout={staffLayoutTransition()}
      style={style}>
      {children}
    </Animated.View>
  );
}

type StaffPressableScaleProps = PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function StaffPressableScale({
  children,
  style,
  scaleTo = 0.97,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: StaffPressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) {
          scale.value = withTiming(scaleTo, pressTiming);
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withTiming(1, pressTiming);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
