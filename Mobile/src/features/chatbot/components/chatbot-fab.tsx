import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DotLottie } from '@lottiefiles/dotlottie-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDesignColors } from '@/hooks/use-design-colors';

const AI_LOTTIE = require('@/components/gif/AI.lottie');

const FAB_SIZE = 56;
const PEEK_WIDTH = 28;
const PEEK_HEIGHT = 48;
const STORAGE_KEY = 'chatbot-fab-collapsed';

type ChatbotFabProps = {
  label: string;
  collapseLabel?: string;
  expandLabel?: string;
  isOpen: boolean;
  onPress: () => void;
  tabBarOffset?: number;
  /** When set, overrides tabBarOffset calculation (distance from screen bottom, before safe area). */
  fixedBottom?: number;
};

/**
 * Collapsible AI FAB: full button when expanded, thin right-edge peek when collapsed
 * so it does not permanently cover content.
 */
export function ChatbotFab({
  label,
  collapseLabel = 'Collapse AI',
  expandLabel = 'Show AI',
  isOpen,
  onPress,
  tabBarOffset = 72,
  fixedBottom,
}: ChatbotFabProps) {
  const DesignColors = useDesignColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const expandProgress = useSharedValue(1);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      const nextCollapsed = value === '1';
      setCollapsed(nextCollapsed);
      expandProgress.value = nextCollapsed ? 0 : 1;
      setReady(true);
    });
  }, [expandProgress]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    expandProgress.value = withTiming(collapsed ? 0 : 1, { duration: 180 });
  }, [collapsed, expandProgress, ready]);

  async function setCollapsedPersist(next: boolean) {
    setCollapsed(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // ignore persistence failures
    }
  }

  const fabStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    transform: [{ scale: 0.7 + expandProgress.value * 0.3 }],
  }));

  const peekStyle = useAnimatedStyle(() => ({
    opacity: 1 - expandProgress.value,
    transform: [{ translateX: expandProgress.value * PEEK_WIDTH }],
  }));

  if (isOpen) {
    return null;
  }

  const bottom =
    fixedBottom !== undefined ? fixedBottom : tabBarOffset + insets.bottom + 12;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      <Animated.View
        pointerEvents={collapsed ? 'none' : 'auto'}
        style={[styles.fabWrap, fabStyle]}
      >
        <Pressable
          accessibilityLabel={label}
          hitSlop={6}
          onPress={onPress}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <DotLottie
            autoplay
            loop
            source={AI_LOTTIE}
            style={styles.fabLottie}
          />
        </Pressable>
        <Pressable
          accessibilityLabel={collapseLabel}
          hitSlop={8}
          onPress={() => void setCollapsedPersist(true)}
          style={({ pressed }) => [styles.collapseBtn, pressed && styles.fabPressed]}
        >
          <Ionicons name="chevron-forward" size={14} color={DesignColors.inkMuted} />
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents={collapsed ? 'auto' : 'none'}
        style={[styles.peekWrap, peekStyle]}
      >
        <Pressable
          accessibilityLabel={expandLabel}
          hitSlop={8}
          onPress={() => void setCollapsedPersist(false)}
          style={({ pressed }) => [styles.peek, pressed && styles.fabPressed]}
        >
          <DotLottie
            autoplay
            loop
            source={AI_LOTTIE}
            style={styles.peekLottie}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    host: {
      position: 'absolute',
      right: 0,
      zIndex: 999,
      elevation: 999,
      width: FAB_SIZE + 24,
      height: FAB_SIZE + 8,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    fabWrap: {
      position: 'absolute',
      right: 16,
      width: FAB_SIZE,
      height: FAB_SIZE,
    },
    fab: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.primary,
      overflow: 'hidden',
    },
    fabLottie: {
      width: 40,
      height: 40,
    },
    collapseBtn: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.surface1,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
    },
    peekWrap: {
      position: 'absolute',
      right: 0,
      width: PEEK_WIDTH,
      height: PEEK_HEIGHT,
    },
    peek: {
      width: PEEK_WIDTH,
      height: PEEK_HEIGHT,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.primary,
      paddingLeft: 2,
      overflow: 'hidden',
    },
    peekLottie: {
      width: 22,
      height: 22,
    },
    fabPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.96 }],
    },
  });
}
