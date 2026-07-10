import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type WithTimingConfig,
} from "react-native-reanimated";

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
  duration: 420,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
};

const HeroTransitionContext = createContext<HeroTransitionContextValue | null>(null);

function HeroTransitionOverlay({
  payload,
  to,
  onFinished,
}: {
  payload: HeroPayload;
  to: HeroBounds;
  onFinished: () => void;
}) {
  const progress = useSharedValue(0);
  const finishedRef = useRef(false);
  const from = payload.from;

  React.useEffect(() => {
    finishedRef.current = false;
    progress.value = 0;
    progress.value = withTiming(1, TIMING_CONFIG, (finished) => {
      if (finished && !finishedRef.current) {
        finishedRef.current = true;
        runOnJS(onFinished)();
      }
    });
  }, [from, onFinished, progress, to]);

  const overlayStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: interpolate(progress.value, [0, 1], [from.x, to.x]),
    top: interpolate(progress.value, [0, 1], [from.y, to.y]),
    width: interpolate(progress.value, [0, 1], [from.width, to.width]),
    height: interpolate(progress.value, [0, 1], [from.height, to.height]),
    borderRadius: interpolate(progress.value, [0, 1], [from.borderRadius, to.borderRadius]),
    overflow: "hidden",
    zIndex: 9999,
  }));

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

  const isHeroHidden = useCallback((id: string) => transition?.payload.id === id, [transition]);

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
      {children}
      {transition?.to ? (
        <HeroTransitionOverlay
          payload={transition.payload}
          to={transition.to}
          onFinished={finishHero}
        />
      ) : null}
    </HeroTransitionContext.Provider>
  );
}

export function useHeroTransition() {
  const context = useContext(HeroTransitionContext);
  if (!context) {
    throw new Error("useHeroTransition must be used within HeroTransitionProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  overlayHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
