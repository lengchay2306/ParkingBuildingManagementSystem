import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ScalePressableProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children: React.ReactNode;
};

/** Nút/thẻ có phản hồi thu nhỏ nhẹ khi chạm. */
export function ScalePressable({
  children,
  style,
  scaleTo = 0.96,
  onPressIn,
  onPressOut,
  ...rest
}: ScalePressableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        scale.value = withSpring(scaleTo, { damping: 16, stiffness: 280 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        onPressOut?.(event);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
