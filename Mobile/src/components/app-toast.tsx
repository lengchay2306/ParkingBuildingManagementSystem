import Ionicons from '@expo/vector-icons/Ionicons';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: number;
  message: string;
  kind: ToastKind;
  title?: string;
};

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind, title?: string) => void;
  setSuppressErrorToasts: (suppress: boolean) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 3200;
const ENTER_MS = 420;
const EXIT_MS = 280;

function resolveToastChrome(
  kind: ToastKind,
  DesignColors: ReturnType<typeof useDesignColors>,
  t: (vi: string, en: string) => string,
) {
  switch (kind) {
    case 'error':
      return {
        accent: DesignColors.semanticDanger,
        iconBg: 'rgba(248,113,113,0.16)',
        icon: 'alert-circle' as const,
        title: t('Thất bại', 'Failed'),
      };
    case 'warning':
      return {
        accent: DesignColors.accentAmber,
        iconBg: 'rgba(251,146,60,0.16)',
        icon: 'warning' as const,
        title: t('Lưu ý', 'Notice'),
      };
    case 'info':
      return {
        accent: DesignColors.accentSky,
        iconBg: 'rgba(96,165,250,0.16)',
        icon: 'information-circle' as const,
        title: t('Thông tin', 'Info'),
      };
    case 'success':
    default:
      return {
        accent: DesignColors.accentEmerald,
        iconBg: 'rgba(52,211,153,0.16)',
        icon: 'checkmark-circle' as const,
        title: t('Thành công', 'Success'),
      };
  }
}

function ToastBanner({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const chrome = resolveToastChrome(toast.kind, DesignColors, t);
  const progress = useSharedValue(1);
  const trackWidth = useSharedValue(0);
  const dismissed = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissed.current) {
      return;
    }
    dismissed.current = true;
    onDismiss(toast.id);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    dismissed.current = false;
    progress.value = 1;
    progress.value = withTiming(
      0,
      {
        duration: TOAST_DURATION_MS,
        easing: Easing.linear,
      },
      (finished) => {
        'worklet';
        if (finished) {
          runOnJS(dismiss)();
        }
      },
    );
  }, [dismiss, progress, toast.id]);

  const progressStyle = useAnimatedStyle(() => ({
    width: trackWidth.value * progress.value,
  }));

  const title = toast.title ?? chrome.title;

  return (
    <Animated.View
      entering={FadeInDown.duration(ENTER_MS).easing(Easing.out(Easing.cubic))}
      exiting={FadeOutUp.duration(EXIT_MS).easing(Easing.in(Easing.cubic))}
      style={[
        styles.card,
        {
          backgroundColor: DesignColors.surface1,
          borderColor: DesignColors.hairlineStrong,
          shadowColor: DesignColors.semanticOverlay,
        },
      ]}>
      <View style={[styles.accent, { backgroundColor: chrome.accent }]} />

      <Pressable accessibilityRole="button" onPress={dismiss} style={styles.body}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: chrome.iconBg, borderColor: `${chrome.accent}55` },
          ]}>
          <Ionicons color={chrome.accent} name={chrome.icon} size={22} />
        </View>

        <View style={styles.copy}>
          <ThemedText style={[styles.title, { color: DesignColors.ink }]}>{title}</ThemedText>
          <ThemedText style={[styles.message, { color: DesignColors.inkMuted }]}>
            {toast.message}
          </ThemedText>
        </View>

        <Pressable
          accessibilityLabel="Dismiss"
          hitSlop={10}
          onPress={dismiss}
          style={styles.closeHit}>
          <Ionicons color={DesignColors.inkSubtle} name="close" size={18} />
        </Pressable>
      </Pressable>

      <View
        onLayout={(event) => {
          trackWidth.value = event.nativeEvent.layout.width;
        }}
        style={[styles.progressTrack, { backgroundColor: DesignColors.surface3 }]}>
        <Animated.View
          style={[styles.progressFill, { backgroundColor: chrome.accent }, progressStyle]}
        />
      </View>
    </Animated.View>
  );
}

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const suppressErrorToastsRef = useRef(0);

  const setSuppressErrorToasts = useCallback((suppress: boolean) => {
    suppressErrorToastsRef.current += suppress ? 1 : -1;
    if (suppressErrorToastsRef.current < 0) {
      suppressErrorToastsRef.current = 0;
    }
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToast((current) => (current?.id === id ? null : current));
  }, []);

  const showToast = useCallback((message: string, kind: ToastKind = 'success', title?: string) => {
    if (kind === 'error' && suppressErrorToastsRef.current > 0) {
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setToast({
      id: Date.now(),
      message: trimmed,
      kind,
      title,
    });
  }, []);

  const contextValue = useMemo(
    () => ({ showToast, setSuppressErrorToasts }),
    [setSuppressErrorToasts, showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Native Modal so toasts sit above other Modals (e.g. VietQR sheet). */}
      <Modal
        animationType="none"
        transparent
        visible={toast !== null}
        statusBarTranslucent
        onRequestClose={() => {
          if (toast) {
            dismissToast(toast.id);
          }
        }}>
        <View
          pointerEvents="box-none"
          style={[
            styles.host,
            {
              paddingTop: insets.top + Spacing.sm,
              paddingHorizontal: Spacing.md,
            },
          ]}>
          {toast ? <ToastBanner key={toast.id} toast={toast} onDismiss={dismissToast} /> : null}
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error('useAppToast must be used within AppToastProvider');
  }

  return value;
}

/** Block red error toasts (e.g. sign-in screen uses mascot speech instead). */
export function useSuppressErrorToasts(enabled = true) {
  const { setSuppressErrorToasts } = useAppToast();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    setSuppressErrorToasts(true);
    return () => setSuppressErrorToasts(false);
  }, [enabled, setSuppressErrorToasts]);
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingLeft: Spacing.md + 4,
    paddingRight: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 2,
    paddingTop: 2,
    minWidth: 0,
  },
  title: {
    ...Typography.bodySm,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  message: {
    ...Typography.bodySm,
    lineHeight: 20,
  },
  closeHit: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  progressTrack: {
    height: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});
