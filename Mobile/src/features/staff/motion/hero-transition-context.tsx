import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
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
};

type ActiveTransition = {
  payload: HeroPayload;
  to: HeroBounds | null;
};

type HeroTransitionContextValue = {
  activeHeroId: string | null;
  isAnimating: boolean;
  startHero: (payload: HeroPayload) => void;
  completeHero: (id: string, to: HeroBounds) => void;
  cancelHero: () => void;
  isHeroHidden: (id: string) => boolean;
};

const TIMING_CONFIG: WithTimingConfig = {
  duration: 580,
  easing: Easing.out(Easing.cubic),
};

const HeroTransitionContext = createContext<HeroTransitionContextValue | null>(null);

function boundsAtFrom(from: HeroBounds) {
  return {
    position: 'absolute' as const,
    left: from.x,
    top: from.y,
    width: from.width,
    height: from.height,
    borderRadius: from.borderRadius,
    overflow: 'hidden' as const,
    zIndex: 9999,
  };
}

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
  const finishedRef = useRef(false);
  const from = payload.from;

  React.useEffect(() => {
    if (!to) {
      progress.value = 0;
      return;
    }

    finishedRef.current = false;
    progress.value = 0;
    progress.value = withTiming(1, TIMING_CONFIG, (finished) => {
      if (finished && !finishedRef.current) {
        finishedRef.current = true;
        runOnJS(onFinished)();
      }
    });
  }, [from, onFinished, progress, to]);

  const overlayStyle = useAnimatedStyle(() => {
    if (!to) {
      return boundsAtFrom(from);
    }

    const t = progress.value;
    const fromCenterX = from.x + from.width / 2;
    const fromCenterY = from.y + from.height / 2;
    const toCenterX = to.x + to.width / 2;
    const toCenterY = to.y + to.height / 2;

    const centerX = interpolate(t, [0, 1], [fromCenterX, toCenterX]);
    const centerY = interpolate(t, [0, 1], [fromCenterY, toCenterY]);
    const scaleX = interpolate(t, [0, 1], [from.width / to.width, 1]);
    const scaleY = interpolate(t, [0, 1], [from.height / to.height, 1]);

    return {
      position: 'absolute',
      left: centerX - to.width / 2,
      top: centerY - to.height / 2,
      width: to.width,
      height: to.height,
      borderRadius: interpolate(t, [0, 1], [from.borderRadius, to.borderRadius]),
      overflow: 'hidden',
      zIndex: 9999,
      transform: [{ scaleX }, { scaleY }],
    };
  });

  return (
    <View style={styles.overlayHost} pointerEvents="none">
      <Animated.View style={overlayStyle}>{payload.content}</Animated.View>
    </View>
  );
}

export function HeroTransitionProvider({ children }: { children: ReactNode }) {
  const [transition, setTransition] = useState<ActiveTransition | null>(null);

  const finishHero = useCallback(() => {
    setTransition(null);
  }, []);

  const startHero = useCallback((payload: HeroPayload) => {
    setTransition({ payload, to: null });
  }, []);

  const completeHero = useCallback((id: string, to: HeroBounds) => {
    setTransition((current) => {
      if (!current || current.payload.id !== id) {
        return current;
      }
      return { ...current, to };
    });
  }, []);

  const cancelHero = useCallback(() => {
    finishHero();
  }, [finishHero]);

  const isHeroHidden = useCallback(
    (id: string) => transition?.payload.id === id,
    [transition],
  );

  const value = useMemo(
    () => ({
      activeHeroId: transition?.payload.id ?? null,
      isAnimating: transition !== null,
      startHero,
      completeHero,
      cancelHero,
      isHeroHidden,
    }),
    [cancelHero, completeHero, isHeroHidden, startHero, transition],
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

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  overlayHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
