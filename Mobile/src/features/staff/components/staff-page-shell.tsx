import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/design';
import { MaxContentWidth } from '@/constants/theme';
import { StaffScreenHeader } from '@/features/staff/components/premium';
import { getStaffBottomNavScrollPadding } from '@/features/staff/components/staff-tab-bar';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { StaffFadeIn } from '@/features/staff/motion/staff-motion';
import { createStaffStyles } from '@/features/staff/styles/common';

type StaffPageShellProps = {
  header?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Root tab layout already applies top safe area — keep false unless screen is full-bleed. */
  applyTopInset?: boolean;
  /** When false, children manage their own scroll surface (e.g. FlatList). */
  scrollable?: boolean;
  /** Fade-in header only on first reveal (e.g. after splash), not on every tab focus. */
  animateHeader?: boolean;
  /**
   * Extra bottom padding so content clears the staff tab bar.
   * Defaults to the shared staff bottom-nav reserve when `reserveBottomNav` is true.
   * Pass `0` (with `reserveBottomNav={false}`) on screens that hide the tab bar.
   */
  bottomNavReserve?: number;
  /** When true (default), apply shared bottom-nav content padding. */
  reserveBottomNav?: boolean;
};

export function useStaffPageContentStyle(
  footer?: React.ReactNode,
  applyTopInset = false,
  contentStyle?: StyleProp<ViewStyle>,
  bottomNavReserve = 0,
) {
  const insets = useSafeAreaInsets();

  return useMemo(
    () => [
      staffPageShellStyles.content,
      {
        paddingTop: (applyTopInset ? insets.top : 0) + Spacing.xs,
        paddingBottom:
          bottomNavReserve > 0
            ? bottomNavReserve
            : footer
              ? Spacing.xxl + insets.bottom
              : Math.max(insets.bottom, Spacing.lg),
      },
      contentStyle,
    ],
    [applyTopInset, bottomNavReserve, contentStyle, footer, insets.bottom, insets.top],
  );
}

function useResolvedBottomNavReserve(
  reserveBottomNav: boolean,
  bottomNavReserve: number | undefined,
) {
  const insets = useSafeAreaInsets();
  return useMemo(() => {
    if (!reserveBottomNav) {
      return bottomNavReserve ?? 0;
    }
    if (bottomNavReserve !== undefined) {
      return bottomNavReserve;
    }
    return getStaffBottomNavScrollPadding(insets.bottom);
  }, [bottomNavReserve, insets.bottom, reserveBottomNav]);
}

export function StaffPageShell({
  header,
  title,
  children,
  footer,
  contentStyle,
  refreshing,
  onRefresh,
  applyTopInset = false,
  scrollable = true,
  animateHeader = false,
  bottomNavReserve,
  reserveBottomNav = true,
}: StaffPageShellProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const resolvedBottomNavReserve = useResolvedBottomNavReserve(reserveBottomNav, bottomNavReserve);
  const pageContentStyle = useStaffPageContentStyle(
    footer,
    applyTopInset,
    contentStyle,
    resolvedBottomNavReserve,
  );

  const headerNode = header ? (
    animateHeader ? (
      <StaffFadeIn animateLayout={false} delay={0}>
        {header}
      </StaffFadeIn>
    ) : (
      header
    )
  ) : title ? (
    animateHeader ? (
      <StaffFadeIn animateLayout={false} delay={0}>
        <StaffScreenHeader title={title} />
      </StaffFadeIn>
    ) : (
      <StaffScreenHeader title={title} />
    )
  ) : null;

  if (!scrollable) {
    // Custom scroll/list surfaces manage their own padding (e.g. Spots).
    return (
      <View style={[styles.container, { backgroundColor: DesignColors.canvas }]}>
        {children}
        {footer}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: DesignColors.canvas }]}>
      <ScrollView
        bounces={Boolean(onRefresh)}
        contentContainerStyle={[pageContentStyle, staffPageShellStyles.scrollContent]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing ?? false}
              onRefresh={onRefresh}
              tintColor={DesignColors.primary}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}>
        {headerNode}
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

export const staffPageShellStyles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.md,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  /** Scroll screens: keep content top-aligned without stretching empty space. */
  scrollContent: {
    justifyContent: 'flex-start',
  },
});
