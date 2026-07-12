import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useHeroTransition, type HeroBounds } from '@/features/staff/motion/hero-transition-context';
import { measureHeroBounds } from '@/features/staff/motion/measure-hero-bounds';

type HeroDestinationProps = {
  heroId: string;
  borderRadius: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export type HeroDestinationHandle = {
  measure: () => Promise<HeroBounds>;
};

/** Measures destination bounds and drives the flying hero overlay into place. */
export const HeroDestination = forwardRef<HeroDestinationHandle, HeroDestinationProps>(
  function HeroDestination({ heroId, borderRadius, children, style }, ref) {
    const viewRef = useRef<View>(null);
    const { isAwaitingDestination, activeHeroId, completeHero, cancelHero, isHeroHidden } =
      useHeroTransition();
    const hidden = isHeroHidden(heroId);
    const shouldComplete = isAwaitingDestination && activeHeroId === heroId;

    useImperativeHandle(ref, () => ({
      measure: () => measureHeroBounds(viewRef.current as View, borderRadius),
    }));

    useEffect(() => {
      if (!shouldComplete || !viewRef.current) {
        return;
      }

      const frame = requestAnimationFrame(() => {
        void measureHeroBounds(viewRef.current as View, borderRadius)
          .then((bounds) => completeHero(heroId, bounds))
          .catch(() => cancelHero());
      });

      const timeout = setTimeout(() => cancelHero(), 800);

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timeout);
      };
    }, [borderRadius, cancelHero, completeHero, heroId, shouldComplete]);

    return (
      <View ref={viewRef} style={[style, hidden && { opacity: 0 }]} collapsable={false}>
        {children}
      </View>
    );
  },
);
