import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import {
  STAFF_TAB_BAR_BODY_HEIGHT,
  STAFF_TAB_CENTER_FAB_FLOAT,
} from '@/features/staff/components/staff-tab-bar';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { useThemePreference } from '@/hooks/theme-preference';

const SCREEN_HEIGHT = Dimensions.get('window').height;

/** Clear FAB + tab row only — do not add Android nav fallback (that opens a black band). */
function getSheetTabClearance() {
  return STAFF_TAB_BAR_BODY_HEIGHT + STAFF_TAB_CENTER_FAB_FLOAT + 8;
}

type StaffSlideSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightRatio?: number;
  sheetStyle?: StyleProp<ViewStyle>;
  /** Lift sheet above bottom edge when keyboard is hidden (0–1 of screen height). */
  bottomSnapRatio?: number;
  /** Fixed px above the screen bottom. */
  bottomOffset?: number;
  /** Keep sheet above the staff tab bar (tab bar stays visible). */
  alignAboveTabBar?: boolean;
  /**
   * Full-screen dim — covers the tab bar so staff only see this sheet.
   * Sheet sits on the safe-area bottom (not above the tab bar).
   */
  coverTabBar?: boolean;
  keyboardAware?: boolean;
};

/**
 * Bottom sheet for staff flows. Always uses RN Modal (reliable with keyboard).
 * Content-sized — never flex-fills the screen (that pushed sheets off-screen).
 */
export function StaffSlideSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeightRatio = 0.92,
  sheetStyle,
  bottomSnapRatio = 0,
  bottomOffset,
  alignAboveTabBar = false,
  coverTabBar = false,
  keyboardAware = true,
}: StaffSlideSheetProps) {
  const DesignColors = useStaffDesignColors();
  const { resolvedScheme } = useThemePreference();
  const isDark = resolvedScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(DesignColors, isDark), [DesignColors, isDark]);

  const baseClearance =
    bottomOffset ??
    (coverTabBar
      ? Math.max(insets.bottom, Spacing.md)
      : alignAboveTabBar
        ? getSheetTabClearance()
        : bottomSnapRatio > 0
          ? Math.round(windowHeight * bottomSnapRatio)
          : Math.max(insets.bottom, Spacing.md));

  const [mounted, setMounted] = useState(visible);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (!visible) {
      setKeyboardOffset(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted || !keyboardAware) {
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardOffset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardAware, mounted]);

  const isKeyboardVisible = keyboardOffset > 0;
  // Prefer padding over translateY for keyboard — translate was pushing sheets off-screen.
  const hostPaddingBottom = isKeyboardVisible
    ? Math.max(keyboardOffset, Spacing.md)
    : baseClearance;

  const maxHeight = windowHeight * maxHeightRatio;
  const effectiveMaxHeight = isKeyboardVisible
    ? Math.min(maxHeight, windowHeight - keyboardOffset - insets.top - Spacing.lg)
    : alignAboveTabBar && !coverTabBar
      ? Math.min(maxHeight, windowHeight - baseClearance - insets.top - Spacing.md)
      : maxHeight;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdropOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) });
      return;
    }

    backdropOpacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: 280, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      },
    );
  }, [backdropOpacity, translateY, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={mounted}>
      <View style={[styles.host, { paddingBottom: hostPaddingBottom }]}>
        <Animated.View
          style={[
            styles.backdrop,
            coverTabBar && styles.backdropOpaque,
            backdropStyle,
            // coverTabBar: dim the whole screen including the tab bar
            coverTabBar ? null : { bottom: hostPaddingBottom },
          ]}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            sheetAnimatedStyle,
            {
              maxHeight: effectiveMaxHeight,
              paddingBottom: Spacing.sm,
            },
            sheetStyle,
          ]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText style={styles.title}>{title}</ThemedText>
              {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
            </View>
            <Pressable
              accessibilityLabel="Close"
              hitSlop={12}
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.82 }]}>
              <Ionicons color={DesignColors.inkMuted} name="close" size={22} />
            </Pressable>
          </View>

          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(
  DesignColors: ReturnType<typeof useStaffDesignColors>,
  isDark: boolean,
) {
  return StyleSheet.create({
    host: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(8,12,20,0.55)' : 'rgba(15,23,42,0.28)',
    },
    backdropOpaque: {
      backgroundColor: isDark ? 'rgba(0,0,0,0.88)' : 'rgba(15,23,42,0.55)',
    },
    sheet: {
      flexGrow: 0,
      alignSelf: 'stretch',
      backgroundColor: DesignColors.surface1,
      borderTopLeftRadius: Radius.xl + 4,
      borderTopRightRadius: Radius.xl + 4,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: DesignColors.hairline,
      overflow: 'hidden',
      zIndex: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: isDark ? 0.18 : 0.1,
      shadowRadius: 24,
      elevation: 16,
    },
    handleRow: {
      alignItems: 'center',
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xs,
    },
    handle: {
      width: 42,
      height: 4,
      borderRadius: 999,
      backgroundColor: DesignColors.hairlineStrong,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.sm,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      fontSize: 18,
    },
    subtitle: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontSize: 12,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.surface2,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    body: {
      flexGrow: 0,
      flexShrink: 1,
      paddingHorizontal: Spacing.lg,
    },
    footer: {
      flexGrow: 0,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
    },
  });
}
