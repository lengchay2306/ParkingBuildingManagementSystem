import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppToastProvider } from '@/components/app-toast';
import { Typography } from '@/constants/design';
import { StaffTabIcon } from '@/features/staff/components/staff-tab-icon';
import { StaffWorkspaceProvider } from '@/features/staff/context/staff-workspace-context';
import { useDesignColors } from '@/hooks/use-design-colors';
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
  const { role } = useSessionRole();
  const isStaff = role === 'STAFF';

  const lightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: DesignColors.canvas,
      card: DesignColors.surface1,
      text: DesignColors.ink,
      border: DesignColors.hairline,
      primary: DesignColors.primary,
    },
  };
  const darkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: DesignColors.canvas,
      card: DesignColors.surface1,
      text: DesignColors.ink,
      border: DesignColors.hairline,
      primary: DesignColors.primary,
    },
  };

  const tabBarStyle = {
    backgroundColor: DesignColors.surface1,
    borderTopWidth: 1,
    borderTopColor: DesignColors.hairline,
    height: 72,
    paddingBottom: 10,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  };

  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? darkTheme : lightTheme}>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: DesignColors.canvas }}>
        <StatusBar
          style={resolvedScheme === 'dark' ? 'light' : 'dark'}
          backgroundColor={DesignColors.canvas}
          translucent={false}
        />
        <AppToastProvider>
          <AnimatedSplashOverlay />
          <Tabs
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: DesignColors.ink,
              tabBarInactiveTintColor: DesignColors.inkSubtle,
              tabBarShowLabel: true,
              tabBarStyle,
              tabBarLabelStyle: {
                ...Typography.caption,
                fontSize: 10,
                marginTop: 2,
                fontWeight: '500',
              },
              tabBarIcon: ({ color, size, focused }) => {
                const iconSize = size + 1;
                if (route.name === '(customer)/home_check1') {
                  return <Ionicons name={focused ? 'home' : 'home-outline'} size={iconSize} color={color} />;
                }
                if (route.name === '(customer)/home_check2') {
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
                if (route.name === '(staff)/staff-home') {
                  return (
                    <StaffTabIcon
                      color={color}
                      focused={focused}
                      name="home"
                      outlineName="home-outline"
                      size={size}
                    />
                  );
                }
                if (route.name === '(staff)/staff-check-in') {
                  return (
                    <StaffTabIcon
                      color={color}
                      focused={focused}
                      name="log-in"
                      outlineName="log-in-outline"
                      size={size}
                    />
                  );
                }
                if (route.name === '(staff)/staff-slots') {
                  return (
                    <StaffTabIcon
                      color={color}
                      focused={focused}
                      name="grid"
                      outlineName="grid-outline"
                      size={size}
                    />
                  );
                }
                if (route.name === '(staff)/staff-operations') {
                  return (
                    <StaffTabIcon
                      color={color}
                      focused={focused}
                      name="construct"
                      outlineName="construct-outline"
                      size={size}
                    />
                  );
                }
                if (route.name === '(staff)/staff-profile') {
                  return (
                    <StaffTabIcon
                      color={color}
                      focused={focused}
                      name="person"
                      outlineName="person-outline"
                      size={size}
                    />
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
              name="(admin)/dashboard"
              options={{ href: null, tabBarStyle: { display: 'none' } }}
            />

            <Tabs.Screen
              name="(customer)/home_check1"
              options={{
                title: t('Trang chủ 1', 'Home'),
                href: isStaff ? null : undefined,
              }}
            />
            <Tabs.Screen
              name="(customer)/home_check2"
              options={{
                title: t('Trang chủ 2', 'Homeless'),
                href: isStaff ? null : undefined,
              }}
            />
            <Tabs.Screen
              name="(customer)/parking-map"
              options={{
                title: t('Bản đồ', 'Map'),
                href: isStaff ? null : undefined,
              }}
            />
            <Tabs.Screen
              name="(customer)/reservations"
              options={{
                title: t('Đặt chỗ', 'Reservations'),
                href: isStaff ? null : undefined,
              }}
            />
            <Tabs.Screen
              name="(customer)/profile"
              options={{
                title: t('Hồ sơ', 'Profile'),
                href: isStaff ? null : undefined,
              }}
            />
            <Tabs.Screen name="(customer)/settings" options={{ href: null }} />
            <Tabs.Screen name="(manager)/manager" options={{ href: null }} />
            <Tabs.Screen name="(customer)/driver" options={{ href: null }} />
            <Tabs.Screen name="(admin)/admin" options={{ href: null }} />

            <Tabs.Screen
              name="(staff)/staff-home"
              options={{
                title: t('Trang chủ', 'Home'),
                href: isStaff ? undefined : null,
              }}
            />
            <Tabs.Screen
              name="(staff)/staff-check-in"
              options={{
                title: t('Check-in', 'Check in'),
                href: isStaff ? undefined : null,
              }}
            />
            <Tabs.Screen
              name="(staff)/staff-slots"
              options={{
                title: t('Bãi xe', 'Lot'),
                href: isStaff ? undefined : null,
              }}
            />
            <Tabs.Screen
              name="(staff)/staff-operations"
              options={{
                title: t('Tác vụ', 'Ops'),
                href: isStaff ? undefined : null,
              }}
            />
            <Tabs.Screen
              name="(staff)/staff-profile"
              options={{
                title: t('Hồ sơ', 'Profile'),
                href: isStaff ? undefined : null,
              }}
            />
            <Tabs.Screen name="(staff)/staff-settings" options={{ href: null }} />
            <Tabs.Screen name="(staff)/staff" options={{ href: null }} />
          </Tabs>
        </AppToastProvider>
      </SafeAreaView>
    </ThemeProvider>
  );
}
