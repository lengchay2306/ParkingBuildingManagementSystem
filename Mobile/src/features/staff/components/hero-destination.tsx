import React, { useEffect, useRef } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useHeroTransition } from "@/features/staff/motion/hero-transition-context";
import { measureHeroBounds } from "@/features/staff/motion/measure-hero-bounds";

type HeroDestinationProps = {
  heroId: string;
  borderRadius: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Measures destination bounds and drives the flying hero overlay into place. */
export function HeroDestination({ heroId, borderRadius, children, style }: HeroDestinationProps) {
  const ref = useRef<View>(null);
  const { activeHeroId, completeHero, cancelHero, isHeroHidden } = useHeroTransition();
  const hidden = isHeroHidden(heroId);

  useEffect(() => {
    if (activeHeroId !== heroId || !ref.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      void measureHeroBounds(ref.current as View, borderRadius)
        .then((bounds) => completeHero(heroId, bounds))
        .catch(() => cancelHero());
    });

    const timeout = setTimeout(() => cancelHero(), 800);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [activeHeroId, borderRadius, cancelHero, completeHero, heroId]);

  return (
    <View ref={ref} style={[style, hidden && { opacity: 0 }]} collapsable={false}>
      {children}
    </View>
  );
}
