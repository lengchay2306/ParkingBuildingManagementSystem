import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

/** Xuất hiện lần lượt từ dưới lên khi mở trang chủ. */
export function StaggeredEnter({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 85)
        .duration(420)
        .springify()
        .damping(18)
        .stiffness(120)}
    >
      {children}
    </Animated.View>
  );
}
