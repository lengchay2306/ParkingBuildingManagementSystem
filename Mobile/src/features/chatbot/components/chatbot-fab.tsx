import { DotLottie } from '@lottiefiles/dotlottie-react-native';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDesignColors } from '@/hooks/use-design-colors';

const AI_LOTTIE = require('@/components/gif/AI.lottie');
const FAB_SIZE = 56;
const FAB_LOTTIE_SIZE = 44;

type ChatbotFabProps = {
  label: string;
  isOpen: boolean;
  onPress: () => void;
  tabBarOffset?: number;
  /** When set, overrides tabBarOffset calculation (distance from screen bottom, before safe area). */
  fixedBottom?: number;
};

export function ChatbotFab({
  label,
  isOpen,
  onPress,
  tabBarOffset = 72,
  fixedBottom,
}: ChatbotFabProps) {
  const DesignColors = useDesignColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  if (isOpen) {
    return null;
  }

  const bottom =
    fixedBottom !== undefined ? fixedBottom : tabBarOffset + insets.bottom + 12;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom, right: 16 }]}>
      <Pressable
        accessibilityLabel={label}
        hitSlop={6}
        onPress={onPress}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
        <DotLottie autoplay loop source={AI_LOTTIE} style={styles.lottie} />
      </Pressable>
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    host: {
      position: 'absolute',
      zIndex: 999,
      elevation: 999,
    },
    fab: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.surface1,
      overflow: 'hidden',
      // No purple glow / border — sits clean on dark canvas
      borderWidth: 0,
      shadowOpacity: 0,
      elevation: 0,
    },
    fabPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
    lottie: {
      width: FAB_LOTTIE_SIZE,
      height: FAB_LOTTIE_SIZE,
    },
  });
}
