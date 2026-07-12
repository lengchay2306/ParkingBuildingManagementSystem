import React, { useMemo } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/design';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { StaffFadeIn, staffLayoutTransition } from '@/features/staff/motion/staff-motion';

type StaffDarkCardProps = {
  children: React.ReactNode;
  accentBorder?: 'success' | 'warning' | 'danger' | 'primary' | 'info' | 'none';
  style?: StyleProp<ViewStyle>;
  index?: number;
};

export function StaffDarkCard({ children, accentBorder = 'none', style, index = 0 }: StaffDarkCardProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const borderColor =
    accentBorder === 'success'
      ? DesignColors.accentEmerald
      : accentBorder === 'warning'
        ? DesignColors.accentAmber
        : accentBorder === 'danger'
          ? DesignColors.semanticDanger
          : accentBorder === 'info'
            ? DesignColors.accentSky
            : accentBorder === 'primary'
              ? DesignColors.primaryFocus
              : 'transparent';

  return (
    <StaffFadeIn index={index}>
      <Animated.View
        layout={staffLayoutTransition()}
        style={[
          styles.card,
          accentBorder !== 'none' && { borderLeftWidth: 4, borderLeftColor: borderColor },
          style,
        ]}>
        {children}
      </Animated.View>
    </StaffFadeIn>
  );
}

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.sm,
      shadowColor: DesignColors.semanticOverlay,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
  });
}
