import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type WithTimingConfig,
} from 'react-native-reanimated';

export type HeroBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
};

export type HeroPayload = {
  id: string;
  from: HeroBounds;
  content: ReactNode;
  /** Rounded stroke drawn by the flying shell (content itself stays square). */
  borderColor?: string;
  /** Fill behind scaled content so letterboxing matches the spot tint. */
  backgroundColor?: string;
};

export type HeroRipple = {
  id: string;
  x: number;
  y: number;
};

type ActiveTransition = {
  payload: HeroPayload;
  to: HeroBounds | null;
  direction: 'forward' | 'reverse';
};

type StoredHeroOrigin = {
  id: string;
  from: HeroBounds;
  content: ReactNode;
  borderColor?: string;
  backgroundColor?: string;
};

type HeroTransitionContextValue = {
  activeHeroId: string | null;
  isAnimating: boolean;
  /** True only while waiting for the detail screen to report destination bounds. */
  isAwaitingDestination: boolean;
  /** Radial reveal origin after a reverse hero lands. */
  ripple: HeroRipple | null;
  startHero: (payload: HeroPayload) => void;
  completeHero: (id: string, to: HeroBounds) => void;
  reverseHero: (id: string, from: HeroBounds, onFinished: () => void) => boolean;
  cancelHero: () => void;
  clearRipple: () => void;
  isHeroHidden: (id: string) => boolean;
  canReverseHero: (id: string) => boolean;
};

const TIMING_CONFIG: WithTimingConfig = {
  duration: 580,
  easing: Easing.out(Easing.cubic),
};

const RIPPLE_DURATION = 820;

const HeroTransitionContext = createContext<HeroTransitionContextValue | null>(null);

function HeroTransitionOverlay({
  payload,
  to,
  onFinished,
}: {
  payload: HeroPayload;
  to: HeroBounds | null;
  onFinished: () => void;
}) {
  const progress = useSharedValue(0);
  const hasFinished = useSharedValue(false);
  const { width: windowWidth } = useWindowDimensions();
  const from = payload.from;
  const borderColor = payload.borderColor ?? 'rgba(255,255,255,0.22)';
  const backgroundColor = payload.backgroundColor ?? 'rgba(16,185,129,0.10)';

  const fromX = from.x;
  const fromY = from.y;
  const fromW = from.width;
  const fromH = from.height;
  const fromRadius = from.borderRadius;
  const toX = to?.x ?? from.x;
  const toY = to?.y ?? from.y;
  const toW = to?.width ?? from.width;
  const toH = to?.height ?? from.height;
  const toRadius = to?.borderRadius ?? from.borderRadius;
  const hasTo = to != null;

  // Header-sized layout for flight content. Estimate while destination is unknown.
  const estimatedHeaderW = Math.max(windowWidth - 32, fromW);
  const estimatedHeaderH = Math.max(188, fromH);
  const natW = hasTo ? Math.max(fromW, toW) : estimatedHeaderW;
  const natH = hasTo ? Math.max(fromH, toH) : estimatedHeaderH;

  React.useEffect(() => {
    if (!to) {
      progress.value = 0;
      hasFinished.value = false;
      return;
    }

    hasFinished.value = false;
    progress.value = 0;
    progress.value = withTiming(1, TIMING_CONFIG, (finished) => {
      'worklet';
      if (finished && !hasFinished.value) {
        hasFinished.value = true;
        runOnJS(onFinished)();
      }
    });
  }, [from, hasFinished, onFinished, progress, to]);

  const overlayStyle = useAnimatedStyle(() => {
    'worklet';
    if (!hasTo) {
      const r = Math.min(fromRadius, fromW / 2, fromH / 2);
      return {
        position: 'absolute' as const,
        left: fromX,
        top: fromY,
        width: fromW,
        height: fromH,
        borderRadius: r,
        borderTopLeftRadius: r,
        borderTopRightRadius: r,
        borderBottomLeftRadius: r,
        borderBottomRightRadius: r,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        overflow: 'hidden' as const,
        zIndex: 9999,
      };
    }

    const t = progress.value;
    const width = interpolate(t, [0, 1], [fromW, toW]);
    const height = interpolate(t, [0, 1], [fromH, toH]);
    const left = interpolate(t, [0, 1], [fromX, toX]);
    const top = interpolate(t, [0, 1], [fromY, toY]);
    const rawRadius = interpolate(t, [0, 1], [fromRadius, toRadius]);
    const r = Math.min(rawRadius, width / 2, height / 2);

    return {
      position: 'absolute' as const,
      left,
      top,
      width,
      height,
      borderRadius: r,
      borderTopLeftRadius: r,
      borderTopRightRadius: r,
      borderBottomLeftRadius: r,
      borderBottomRightRadius: r,
      borderWidth: 1,
      borderColor,
      backgroundColor,
      overflow: 'hidden' as const,
      zIndex: 9999,
    };
  }, [
    fromX,
    fromY,
    fromW,
    fromH,
    fromRadius,
    toX,
    toY,
    toW,
    toH,
    toRadius,
    hasTo,
    borderColor,
    backgroundColor,
  ]);

  const contentStyle = useAnimatedStyle(() => {
    'worklet';
    if (!hasTo) {
      // Parked on the cell while waiting for destination — shrink header into the cell.
      const scale = Math.min(fromW / Math.max(natW, 1), fromH / Math.max(natH, 1));
      return {
        position: 'absolute' as const,
        width: natW,
        height: natH,
        left: (fromW - natW) / 2,
        top: (fromH - natH) / 2,
        transform: [{ scale }],
      };
    }

    const t = progress.value;
    const width = interpolate(t, [0, 1], [fromW, toW]);
    const height = interpolate(t, [0, 1], [fromH, toH]);
    const scale = Math.min(width / Math.max(natW, 1), height / Math.max(natH, 1));

    return {
      position: 'absolute' as const,
      width: natW,
      height: natH,
      left: (width - natW) / 2,
      top: (height - natH) / 2,
      transform: [{ scale }],
    };
  }, [fromW, fromH, toW, toH, natW, natH, hasTo]);

  return (
    <View style={styles.overlayHost} pointerEvents="none">
      <Animated.View collapsable={false} style={overlayStyle}>
        <Animated.View collapsable={false} style={contentStyle}>
          {payload.content}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function HeroRippleOverlay({
  ripple,
  onDone,
}: {
  ripple: HeroRipple;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const hasFinished = useSharedValue(false);
  const maxRadius = Math.hypot(width, height);

  React.useEffect(() => {
    hasFinished.value = false;
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: RIPPLE_DURATION, easing: Easing.out(Easing.cubic) },
      (finished) => {
        'worklet';
        if (finished && !hasFinished.value) {
          hasFinished.value = true;
          runOnJS(onDone)();
        }
      },
    );
  }, [hasFinished, onDone, progress, ripple.id, ripple.x, ripple.y]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [0.55, 0.22, 0]),
  }));

  const ring0 = useAnimatedStyle(() => {
    const local = Math.max(0, Math.min(1, progress.value / 1));
    const size = interpolate(local, [0, 1], [28, maxRadius * 2]);
    return {
      position: 'absolute' as const,
      left: ripple.x - size / 2,
      top: ripple.y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: interpolate(local, [0, 0.35, 1], [3, 2, 0.5]),
      borderColor: 'rgba(255,255,255,0.30)',
      opacity: interpolate(local, [0, 0.15, 1], [0, 0.6, 0]),
    };
  });

  const ring1 = useAnimatedStyle(() => {
    const local = Math.max(0, Math.min(1, (progress.value - 0.08) / 0.92));
    const size = interpolate(local, [0, 1], [28, maxRadius * 2]);
    return {
      position: 'absolute' as const,
      left: ripple.x - size / 2,
      top: ripple.y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: interpolate(local, [0, 0.35, 1], [2.5, 1.5, 0.4]),
      borderColor: 'rgba(255,255,255,0.22)',
      opacity: interpolate(local, [0, 0.15, 1], [0, 0.45, 0]),
    };
  });

  const ring2 = useAnimatedStyle(() => {
    const local = Math.max(0, Math.min(1, (progress.value - 0.16) / 0.84));
    const size = interpolate(local, [0, 1], [28, maxRadius * 2]);
    return {
      position: 'absolute' as const,
      left: ripple.x - size / 2,
      top: ripple.y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: interpolate(local, [0, 0.35, 1], [2, 1.2, 0.3]),
      borderColor: 'rgba(255,255,255,0.16)',
      opacity: interpolate(local, [0, 0.15, 1], [0, 0.32, 0]),
    };
  });

  return (
    <View pointerEvents="none" style={styles.overlayHost}>
      <Animated.View style={[styles.rippleScrim, scrimStyle]} />
      <Animated.View style={ring0} />
      <Animated.View style={ring1} />
      <Animated.View style={ring2} />
    </View>
  );
}

export function HeroTransitionProvider({ children }: { children: ReactNode }) {
  const [transition, setTransition] = useState<ActiveTransition | null>(null);
  const [ripple, setRipple] = useState<HeroRipple | null>(null);
  const originRef = useRef<StoredHeroOrigin | null>(null);
  const finishCallbackRef = useRef<(() => void) | null>(null);
  const pendingRippleRef = useRef<HeroRipple | null>(null);

  const clearRipple = useCallback(() => {
    setRipple(null);
  }, []);

  const finishHero = useCallback(() => {
    const callback = finishCallbackRef.current;
    finishCallbackRef.current = null;
    const pendingRipple = pendingRippleRef.current;
    pendingRippleRef.current = null;
    setTransition(null);
    if (pendingRipple) {
      setRipple(pendingRipple);
    }
    callback?.();
  }, []);

  const startHero = useCallback((payload: HeroPayload) => {
    originRef.current = {
      id: payload.id,
      from: payload.from,
      content: payload.content,
      borderColor: payload.borderColor,
      backgroundColor: payload.backgroundColor,
    };
    finishCallbackRef.current = null;
    pendingRippleRef.current = null;
    setRipple(null);
    setTransition({ payload, to: null, direction: 'forward' });
  }, []);

  const completeHero = useCallback((id: string, to: HeroBounds) => {
    setTransition((current) => {
      if (!current || current.payload.id !== id || current.direction !== 'forward') {
        return current;
      }
      return { ...current, to };
    });
  }, []);

  const reverseHero = useCallback((id: string, from: HeroBounds, onFinished: () => void) => {
    const origin = originRef.current;
    if (!origin || origin.id !== id) {
      return false;
    }

    finishCallbackRef.current = onFinished;
    pendingRippleRef.current = {
      id,
      x: origin.from.x + origin.from.width / 2,
      y: origin.from.y + origin.from.height / 2,
    };
    setTransition({
      payload: {
        id,
        from,
        content: origin.content,
        borderColor: origin.borderColor,
        backgroundColor: origin.backgroundColor,
      },
      to: origin.from,
      direction: 'reverse',
    });
    return true;
  }, []);

  const cancelHero = useCallback(() => {
    finishCallbackRef.current = null;
    pendingRippleRef.current = null;
    setTransition(null);
  }, []);

  const isHeroHidden = useCallback(
    (id: string) => transition?.payload.id === id,
    [transition],
  );

  const canReverseHero = useCallback((id: string) => originRef.current?.id === id, []);

  const value = useMemo(
    () => ({
      activeHeroId: transition?.payload.id ?? null,
      isAnimating: transition !== null,
      isAwaitingDestination:
        transition != null && transition.direction === 'forward' && transition.to == null,
      ripple,
      startHero,
      completeHero,
      reverseHero,
      cancelHero,
      clearRipple,
      isHeroHidden,
      canReverseHero,
    }),
    [
      cancelHero,
      canReverseHero,
      clearRipple,
      completeHero,
      isHeroHidden,
      reverseHero,
      ripple,
      startHero,
      transition,
    ],
  );

  return (
    <HeroTransitionContext.Provider value={value}>
      <View style={styles.host}>
        {children}
        {transition ? (
          <HeroTransitionOverlay
            payload={transition.payload}
            to={transition.to}
            onFinished={finishHero}
          />
        ) : null}
        {ripple ? <HeroRippleOverlay ripple={ripple} onDone={clearRipple} /> : null}
      </View>
    </HeroTransitionContext.Provider>
  );
}

export function useHeroTransition() {
  const context = useContext(HeroTransitionContext);
  if (!context) {
    throw new Error('useHeroTransition must be used within HeroTransitionProvider');
  }
  return context;
}

/** Fade a list cell in as the reverse-hero ripple expands from the origin spot. */
export function useHeroRippleReveal(cellRef: React.RefObject<View | null>) {
  const { ripple } = useHeroTransition();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (!ripple || !cellRef.current?.measureInWindow) {
      opacity.value = 1;
      scale.value = 1;
      return;
    }

    opacity.value = 0;
    scale.value = 0.92;

    cellRef.current.measureInWindow((x, y, width, height) => {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const dist = Math.hypot(cx - ripple.x, cy - ripple.y);
      const delay = Math.min(Math.round(dist * 0.55), 480);

      opacity.value = withDelay(
        delay,
        withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) }),
      );
      scale.value = withDelay(
        delay,
        withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
      );
    });
  }, [cellRef, opacity, ripple, scale]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  overlayHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  contentFill: {
    ...StyleSheet.absoluteFillObject,
  },
  rippleScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
});
