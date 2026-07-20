import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppToastProvider } from '@/components/app-toast';
import { Typography } from '@/constants/design';
import { MobileChatbotWidget } from '@/features/chatbot/components/mobile-chatbot-widget';
import {
  createStaffTabBarStyle,
  getStaffTabBarBottomInset,
  StaffTabBar,
} from '@/features/staff/components/staff-tab-bar';
import { StaffWorkspaceProvider } from '@/features/staff/context/staff-workspace-context';
import { useAndroidAuthenticatedBack } from '@/hooks/use-android-authenticated-back';
import { useDesignColors } from '@/hooks/use-design-colors';
import { DesignColorsStaffLight } from '@/constants/design';
import { LanguagePreferenceProvider, useLanguagePreference } from '@/hooks/language-preference';
import { SessionRoleProvider, useSessionRole } from '@/hooks/session-role';
import { ThemePreferenceProvider, useThemePreference } from '@/hooks/theme-preference';

export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <LanguagePreferenceProvider>
          <SessionRoleProvider>
            <StaffWorkspaceProvider>
              <RootNavigator />
            </StaffWorkspaceProvider>
          </SessionRoleProvider>
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { resolvedScheme } = useThemePreference();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const insets = useSafeAreaInsets();
  const { role, isAuthenticated, isLoading: isRoleLoading } = useSessionRole();
  const isStaff = role === 'STAFF';
  const staffColors = isStaff && resolvedScheme === 'light' ? DesignColorsStaffLight : DesignColors;
  const screenColors = isStaff ? staffColors : DesignColors;

  useAndroidAuthenticatedBack(isAuthenticated);

  // Staff custom tab bar applies its own inset; keep raw value for createStaffTabBarStyle.
  const tabBarBottomInset = isStaff ? insets.bottom : getStaffTabBarBottomInset(insets.bottom);
  const tabBarContentHeight = 52;
  const tabBarVerticalPadding = 6;

  const lightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: screenColors.canvas,
      card: screenColors.surface1,
      text: screenColors.ink,
      border: screenColors.hairline,
      primary: screenColors.primary,
    },
  };
  const darkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: screenColors.canvas,
      card: screenColors.surface1,
      text: screenColors.ink,
      border: screenColors.hairline,
      primary: screenColors.primary,
    },
  };

  const tabBarStyle = isStaff
    ? createStaffTabBarStyle(tabBarBottomInset)
    : {
        backgroundColor: screenColors.surface1,
        borderTopWidth: 1,
        borderTopColor: screenColors.hairline,
        height: tabBarContentHeight + tabBarVerticalPadding * 2 + tabBarBottomInset,
        paddingBottom: tabBarBottomInset + tabBarVerticalPadding,
        paddingTop: tabBarVerticalPadding,
        elevation: 0,
        shadowOpacity: 0,
      };

  const staffTabBarActiveTintColor = screenColors.primary;
  const staffTabBarInactiveTintColor = screenColors.inkSubtle;

  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? darkTheme : lightTheme}>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: screenColors.canvas }}>
        <StatusBar
          style={resolvedScheme === 'dark' ? 'light' : 'dark'}
          backgroundColor={screenColors.canvas}
          translucent={false}
        />
        <AppToastProvider>
          <AnimatedSplashOverlay />
          <Tabs
            tabBar={isStaff ? (props) => <StaffTabBar {...props} /> : undefined}
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: isStaff ? staffTabBarActiveTintColor : DesignColors.ink,
              tabBarInactiveTintColor: isStaff ? staffTabBarInactiveTintColor : DesignColors.inkSubtle,
              tabBarShowLabel: !isStaff,
              tabBarStyle,
              tabBarLabelStyle: {
                ...Typography.caption,
                fontSize: 10,
                marginTop: 2,
                fontWeight: '500',
              },
              tabBarIcon: isStaff
                ? () => null
                : ({ color, size, focused }) => {
                const iconSize = size + 1;
                if (route.name === '(customer)/home') {
                  return <Ionicons name={focused ? 'home' : 'home-outline'} size={iconSize} color={color} />;
                }
                if (route.name === '(customer)/parking-map') {
                  return <Ionicons name={focused ? 'map' : 'map-outline'} size={iconSize} color={color} />;
                }
                if (route.name === '(customer)/reservations') {
                  return (
                    <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={iconSize} color={color} />
                  );
                }
                if (route.name === '(customer)/profile') {
                  return <Ionicons name={focused ? 'person' : 'person-outline'} size={iconSize} color={color} />;
                }
                if (route.name === '(customer)/settings') {
                  return (
                    <Ionicons name={focused ? 'settings' : 'settings-outline'} size={iconSize} color={color} />
                  );
                }
                if (route.name === '(staff)/staff-settings') {
                  return (
                    <Ionicons name={focused ? 'settings' : 'settings-outline'} size={iconSize} color={color} />
                  );
                }
                return <Ionicons name="ellipse-outline" size={iconSize} color={color} />;
              },
            })}
          >
            <Tabs.Screen name="index" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen
              name="(auth)/sign-platform"
              options={{ href: null, tabBarStyle: { display: 'none' } }}
            />

            <Tabs.Screen
              name="(customer)/home"
              options={{
                title: t('Trang chủ', 'Home'),
                href: isStaff ? null : '/home',
              }}
            />
            <Tabs.Screen
              name="(customer)/parking-map"
              options={{
                title: t('Bản đồ', 'Map'),
                href: isStaff ? null : '/parking-map',
              }}
            />
            <Tabs.Screen
              name="(customer)/reservations"
              options={{
                title: t('Đặt chỗ', 'Reservations'),
                href: isStaff ? null : '/reservations',
              }}
            />
            <Tabs.Screen
              name="(customer)/profile"
              options={{
                title: t('Hồ sơ', 'Profile'),
                href: isStaff ? null : '/profile',
              }}
            />
            <Tabs.Screen name="(customer)/settings" options={{ href: null }} />
            <Tabs.Screen name="(customer)/driver" options={{ href: null }} />
            <Tabs.Screen
              name="payment"
              options={{ href: null, tabBarStyle: { display: 'none' } }}
            />
            <Tabs.Screen name="cancel" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="return" options={{ href: null, tabBarStyle: { display: 'none' } }} />

            <Tabs.Screen
              name="(staff)/staff-home"
              options={{
                title: t('Dashboard', 'Dashboard'),
                href: isStaff || isRoleLoading ? '/staff-home' : null,
              }}
            />
            <Tabs.Screen
              name="(staff)/staff-slots"
              options={{
                title: t('Spots', 'Spots'),
                href: isStaff || isRoleLoading ? '/staff-slots' : null,
              }}
            />
            <Tabs.Screen
              name="(staff)/staff-scan"
              options={{
                title: t('Quét QR', 'Scan QR'),
                href: isStaff || isRoleLoading ? '/staff-scan' : null,
              }}
            />
            <Tabs.Screen name="(staff)/staff-check-in" options={{ href: null }} />
            <Tabs.Screen
              name="(staff)/staff-sessions"
              options={{
                title: t('Sessions', 'Sessions'),
                href: isStaff || isRoleLoading ? '/staff-sessions' : null,
              }}
            />
            <Tabs.Screen name="(staff)/staff-operations" options={{ href: null }} />
            <Tabs.Screen
              name="(staff)/staff-profile"
              options={{
                title: t('Staff', 'Staff'),
                href: isStaff || isRoleLoading ? '/staff-profile' : null,
              }}
            />
            <Tabs.Screen name="(staff)/staff-settings" options={{ href: null }} />
            <Tabs.Screen name="(staff)/staff" options={{ href: null }} />
          </Tabs>
          <MobileChatbotWidget />
        </AppToastProvider>
      </SafeAreaView>
    </ThemeProvider>
  );
}
