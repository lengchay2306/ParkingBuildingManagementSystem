import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Typography } from "@/constants/design";

type AnimatedLoaderProps = {
  color: string;
  size?: "small" | "large";
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** Spinner có xoay + pulse nhẹ — dùng khi đang tải dữ liệu. */
export function AnimatedLoader({ color, size = "large", label, style }: AnimatedLoaderProps) {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);
  const iconSize = size === "large" ? 26 : 16;
  const ringSize = size === "large" ? 56 : 36;

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: pulse.value }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(280)} style={[styles.wrap, style]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: `${color}40`,
          },
          spinStyle,
        ]}
      >
        <Ionicons name="sync" size={iconSize} color={color} />
      </Animated.View>
      {label ? <ThemedText style={[styles.label, { color }]}>{label}</ThemedText> : null}
    </Animated.View>
  );
}

/** Khối loading full-screen với card bo góc. */
export function AnimatedLoaderCard({
  color,
  label,
  cardStyle,
}: {
  color: string;
  label?: string;
  cardStyle?: ViewStyle;
}) {
  return (
    <View style={[styles.card, cardStyle]}>
      <AnimatedLoader color={color} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  label: {
    ...Typography.caption,
    fontWeight: "500",
  },
  card: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    minWidth: 56,
  },
});
