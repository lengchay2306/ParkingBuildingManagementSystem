import Ionicons from "@expo/vector-icons/Ionicons";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Radius, Typography } from "@/constants/design";
import { Spacing } from "@/constants/theme";
import { useDesignColors } from "@/hooks/use-design-colors";

type ToastKind = "success" | "error";

type ToastState = {
  id: number;
  message: string;
  kind: ToastKind;
} | null;

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void;
  setSuppressErrorToasts: (suppress: boolean) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_MS = 2800;

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const colors = useDesignColors();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressErrorToastsRef = useRef(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  const setSuppressErrorToasts = useCallback((suppress: boolean) => {
    suppressErrorToastsRef.current += suppress ? 1 : -1;
    if (suppressErrorToastsRef.current < 0) {
      suppressErrorToastsRef.current = 0;
    }
  }, []);

  const animateIn = useCallback(() => {
    opacity.setValue(0);
    translateY.setValue(-12);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const animateOut = useCallback(
    (onDone?: () => void) => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -8,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDone?.();
      });
    },
    [opacity, translateY],
  );

  const showToast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      if (kind === "error" && suppressErrorToastsRef.current > 0) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const id = Date.now();
      setToast({ id, message, kind });
      animateIn();

      timerRef.current = setTimeout(() => {
        animateOut(() => {
          setToast((current) => (current?.id === id ? null : current));
        });
      }, TOAST_MS);
    },
    [animateIn, animateOut],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const contextValue = useMemo(
    () => ({ showToast, setSuppressErrorToasts }),
    [setSuppressErrorToasts, showToast],
  );

  const isSuccess = toast?.kind === "success";
  const accent = isSuccess ? colors.semanticSuccess : colors.semanticDanger;
  const iconName = isSuccess ? "checkmark-circle" : "alert-circle";

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastWrap,
            {
              top: insets.top + Spacing.two,
              backgroundColor: colors.surface1,
              borderColor: colors.hairlineStrong,
              shadowColor: colors.semanticOverlay,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.accentBar, { backgroundColor: accent }]} />
          <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
            <Ionicons name={iconName} size={20} color={accent} />
          </View>
          <ThemedText style={[styles.toastText, { color: colors.ink }]} numberOfLines={3}>
            {toast.message}
          </ThemedText>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error("useAppToast must be used within AppToastProvider");
  }

  return value;
}

/** Block red error toasts (e.g. sign-in screen uses mascot speech instead). */
export function useSuppressErrorToasts(enabled = true) {
  const { setSuppressErrorToasts } = useAppToast();

  useEffect(() => {
    if (!enabled) return;
    setSuppressErrorToasts(true);
    return () => setSuppressErrorToasts(false);
  }, [enabled, setSuppressErrorToasts]);
}

const styles = StyleSheet.create({
  toastWrap: {
    position: "absolute",
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 50,
    alignSelf: "center",
    maxWidth: 420,
    minHeight: 52,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingRight: 14,
    paddingLeft: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  toastText: {
    ...Typography.body,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
});
