import Ionicons from '@expo/vector-icons/Ionicons';
import { DotLottie } from '@lottiefiles/dotlottie-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StaffTabIcon } from '@/features/staff/components/staff-tab-icon';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

/** Visible tab row height (icons sit here). */
export const STAFF_TAB_BAR_BODY_HEIGHT = 58;
/** Center QR FAB diameter — larger than side icons. */
export const STAFF_TAB_CENTER_BUTTON_SIZE = 56;
/** How far the FAB protrudes above the bar top edge (15–20px). */
export const STAFF_TAB_CENTER_FAB_FLOAT = 18;
/** Gap between FAB edge and the SVG cutout on the sides. */
const CUTOUT_GAP = 10;
/** Extra depth below the FAB so the bowl does not touch the button edge. */
const CUTOUT_BOTTOM_CLEARANCE = 12;
/** Soft lip width — blends flat top into the circular bowl (avoids 90° kink). */
const CUTOUT_SHOULDER = 24;
/** Cubic-bezier kappa for approximating a quarter circle. */
const CIRCLE_KAPPA = 0.5522847498;
/** Android 3-button nav fallback when safe-area bottom is 0. */
export const STAFF_ANDROID_NAV_FALLBACK_INSET = 56;

const QR_SCAN_LOTTIE = require('@/components/gif/QR Code Scanner.lottie');

export function getStaffTabBarBottomInset(safeAreaBottom: number) {
  if (safeAreaBottom > 0) {
    return safeAreaBottom;
  }
  return Platform.OS === 'android' ? STAFF_ANDROID_NAV_FALLBACK_INSET : 0;
}

export function getStaffTabBarReservedHeight(safeAreaBottom: number) {
  return (
    STAFF_TAB_BAR_BODY_HEIGHT +
    STAFF_TAB_CENTER_FAB_FLOAT +
    getStaffTabBarBottomInset(safeAreaBottom)
  );
}

/**
 * Clearance for bottom sheets above the tab bar.
 * Excludes FAB float so the sheet sits flush on the bar top and the FAB overlays it (MoMo).
 * Using the full reserved height left a large canvas-colored void under Confirm Entry.
 */
export function getStaffSheetTabBarClearance(safeAreaBottom: number) {
  return STAFF_TAB_BAR_BODY_HEIGHT + getStaffTabBarBottomInset(safeAreaBottom);
}

export function getStaffBottomNavScrollPadding(safeAreaBottom: number) {
  // Clear the floating QR + icon row only — do not pad the full Android system-nav
  // inset again (that creates a large empty black band above the tab bar).
  void safeAreaBottom;
  return STAFF_TAB_BAR_BODY_HEIGHT + STAFF_TAB_CENTER_FAB_FLOAT + 12;
}

/** Bottom padding for the scan HUD so it sits just above the tab bar / FAB. */
export function getStaffScanHudBottomPadding(safeAreaBottom: number) {
  void safeAreaBottom;
  return STAFF_TAB_BAR_BODY_HEIGHT + STAFF_TAB_CENTER_FAB_FLOAT + 4;
}

export function getStaffChatbotFabBottom(safeAreaBottom: number) {
  return getStaffTabBarReservedHeight(safeAreaBottom) + 12;
}

/**
 * Dock style for React Navigation. Transparent — SVG paints the bar from theme tokens.
 * Height includes FAB float so the elevated button is not clipped.
 */
export function createStaffTabBarStyle(safeAreaBottom: number): ViewStyle {
  const bottomInset = getStaffTabBarBottomInset(safeAreaBottom);

  return {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    height: STAFF_TAB_BAR_BODY_HEIGHT + STAFF_TAB_CENTER_FAB_FLOAT + bottomInset,
    paddingBottom: 0,
    paddingTop: 0,
    marginBottom: 0,
    elevation: 0,
    shadowOpacity: 0,
    overflow: 'visible',
  };
}

export function createHiddenStaffTabBarStyle(): ViewStyle {
  return { display: 'none' };
}

/**
 * Soft U-cutout under the center FAB.
 * Notch uses only cubic Beziers — no Arc and no sharp L joins on the curve.
 * Flat top + bar body still use H/V only to close the rectangle.
 */
export function buildStaffTabBarCutoutPath(
  width: number,
  height: number,
  fabSize: number = STAFF_TAB_CENTER_BUTTON_SIZE,
) {
  const cx = width / 2;
  const r = fabSize / 2 + CUTOUT_GAP;
  const lip = CUTOUT_SHOULDER;
  const k = CIRCLE_KAPPA;

  // FAB bottom in SVG space (SVG starts at bar top = FAB_FLOAT from screen top of tab root)
  const fabBottomInSvg = fabSize - STAFF_TAB_CENTER_FAB_FLOAT;
  // Bowl deeper than the FAB bottom so a clear gap remains under the button
  const depth = fabBottomInSvg + CUTOUT_BOTTOM_CLEARANCE;

  const leftFlat = cx - r - lip;
  const rightFlat = cx + r + lip;

  // Continuous cubic U that cradles the FAB with side + bottom clearance.
  return [
    `M0,0`,
    `H${leftFlat}`,
    // Left lip → upper-left bowl (gentle dive)
    `C${leftFlat + lip * 0.6},0 ${cx - r - lip * 0.05},${depth * 0.12} ${cx - r * 0.88},${depth * 0.55}`,
    // Upper-left → bottom center
    `C${cx - r * 0.55},${depth * 0.92} ${cx - r * k * 0.85},${depth} ${cx},${depth}`,
    // Bottom center → upper-right
    `C${cx + r * k * 0.85},${depth} ${cx + r * 0.55},${depth * 0.92} ${cx + r * 0.88},${depth * 0.55}`,
    // Upper-right → right lip (gentle rise)
    `C${cx + r + lip * 0.05},${depth * 0.12} ${rightFlat - lip * 0.6},0 ${rightFlat},0`,
    `H${width}`,
    `V${height}`,
    `H0`,
    `Z`,
  ].join(' ');
}

type SideRouteName =
  | '(staff)/staff-home'
  | '(staff)/staff-slots'
  | '(staff)/staff-sessions'
  | '(staff)/staff-profile';

type SideTabConfig = {
  routeName: SideRouteName;
  labelVi: string;
  labelEn: string;
  icon: keyof typeof Ionicons.glyphMap;
  outlineIcon: keyof typeof Ionicons.glyphMap;
};

const CENTER_ROUTE = '(staff)/staff-scan';

const LEFT_TABS: SideTabConfig[] = [
  {
    routeName: '(staff)/staff-home',
    labelVi: 'Dashboard',
    labelEn: 'Dashboard',
    icon: 'speedometer',
    outlineIcon: 'speedometer-outline',
  },
  {
    routeName: '(staff)/staff-slots',
    labelVi: 'Spots',
    labelEn: 'Spots',
    icon: 'grid',
    outlineIcon: 'grid-outline',
  },
];

const RIGHT_TABS: SideTabConfig[] = [
  {
    routeName: '(staff)/staff-sessions',
    labelVi: 'Sessions',
    labelEn: 'Sessions',
    icon: 'list',
    outlineIcon: 'list-outline',
  },
  {
    routeName: '(staff)/staff-profile',
    labelVi: 'Staff',
    labelEn: 'Staff',
    icon: 'person',
    outlineIcon: 'person-outline',
  },
];

function StaffTabBarBackground({
  width,
  height,
  fill,
}: {
  width: number;
  height: number;
  fill: string;
}) {
  const d = useMemo(
    () => buildStaffTabBarCutoutPath(width, height, STAFF_TAB_CENTER_BUTTON_SIZE),
    [width, height],
  );

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={StyleSheet.absoluteFill}>
      <Path d={d} fill={fill} />
    </Svg>
  );
}

export function StaffTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const focusedRoute = state.routes[state.index];
  const focusedOptions = focusedRoute ? descriptors[focusedRoute.key]?.options : undefined;
  const tabBarStyle = focusedOptions?.tabBarStyle as ViewStyle | ViewStyle[] | undefined;
  const flatStyle = (Array.isArray(tabBarStyle) ? StyleSheet.flatten(tabBarStyle) : tabBarStyle) as
    | ViewStyle
    | undefined;

  // Nested stack screens (session/slot detail) — keep the tab bar out of layout.
  const nestedState = focusedRoute?.state as { index?: number } | undefined;
  const onNestedStackScreen = typeof nestedState?.index === 'number' && nestedState.index > 0;

  if (flatStyle?.display === 'none' || onNestedStackScreen) {
    return null;
  }

  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { t } = useLanguagePreference();
  const DesignColors = useStaffDesignColors();
  const bottomInset = getStaffTabBarBottomInset(insets.bottom);
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const totalHeight = STAFF_TAB_CENTER_FAB_FLOAT + STAFF_TAB_BAR_BODY_HEIGHT + bottomInset;
  const svgHeight = STAFF_TAB_BAR_BODY_HEIGHT + bottomInset;

  const centerRoute = state.routes.find((route) => route.name === CENTER_ROUTE);
  const centerIndex = centerRoute ? state.routes.indexOf(centerRoute) : -1;
  const centerFocused = centerIndex === state.index;

  function navigateToRoute(routeName: string, routeKey: string, focused: boolean) {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  function renderSideTab(config: SideTabConfig) {
    const route = state.routes.find((item) => item.name === config.routeName);
    if (!route) {
      return <View key={config.routeName} style={styles.tabSlot} />;
    }

    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    const color = focused ? DesignColors.ink : DesignColors.inkSubtle;

    return (
      <Pressable
        key={config.routeName}
        accessibilityLabel={t(config.labelVi, config.labelEn)}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        onPress={() => navigateToRoute(route.name, route.key, focused)}
        style={({ pressed }) => [styles.tabSlot, pressed && styles.tabPressed]}>
        <StaffTabIcon
          color={color}
          focused={focused}
          name={config.icon}
          outlineName={config.outlineIcon}
          size={22}
        />
      </Pressable>
    );
  }

  return (
    <View pointerEvents="box-none" style={[styles.root, { height: totalHeight }]}>
      <View
        pointerEvents="none"
        style={[
          styles.svgHost,
          {
            top: STAFF_TAB_CENTER_FAB_FLOAT,
            height: svgHeight,
          },
        ]}>
        <StaffTabBarBackground
          fill={DesignColors.canvas}
          height={svgHeight}
          width={windowWidth}
        />
      </View>

      <View
        style={[
          styles.bar,
          { top: STAFF_TAB_CENTER_FAB_FLOAT, height: STAFF_TAB_BAR_BODY_HEIGHT },
        ]}>
        {LEFT_TABS.map(renderSideTab)}
        <View style={styles.centerSpacer} />
        {RIGHT_TABS.map(renderSideTab)}
      </View>

      {centerRoute ? (
        <Pressable
          accessibilityLabel={t('Quét QR', 'Scan QR')}
          accessibilityRole="button"
          accessibilityState={centerFocused ? { selected: true } : {}}
          onPress={() => navigateToRoute(centerRoute.name, centerRoute.key, centerFocused)}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: centerFocused ? DesignColors.primaryFocus : DesignColors.primary,
            },
            pressed && styles.fabPressed,
          ]}>
          <DotLottie autoplay loop source={QR_SCAN_LOTTIE} style={styles.fabLottie} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(_DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    root: {
      width: '100%',
      backgroundColor: 'transparent',
      overflow: 'visible',
    },
    svgHost: {
      position: 'absolute',
      left: 0,
      right: 0,
      overflow: 'visible',
      // No colored glow — keep bar flush with dark canvas
      shadowOpacity: 0,
      elevation: 0,
    },
    bar: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: 4,
      zIndex: 2,
    },
    tabSlot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
    },
    tabPressed: {
      opacity: 0.82,
    },
    centerSpacer: {
      width: STAFF_TAB_CENTER_BUTTON_SIZE + CUTOUT_GAP * 2,
      flexShrink: 0,
    },
    fab: {
      position: 'absolute',
      top: 0,
      left: '50%',
      marginLeft: -STAFF_TAB_CENTER_BUTTON_SIZE / 2,
      width: STAFF_TAB_CENTER_BUTTON_SIZE,
      height: STAFF_TAB_CENTER_BUTTON_SIZE,
      borderRadius: STAFF_TAB_CENTER_BUTTON_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      zIndex: 10,
      // No purple glow / border ring
      borderWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
    },
    fabPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.96 }],
    },
    fabLottie: {
      width: 42,
      height: 42,
    },
  });
}
