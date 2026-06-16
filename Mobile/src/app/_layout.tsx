import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppToastProvider } from '@/components/app-toast';
import { Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { LanguagePreferenceProvider, useLanguagePreference } from '@/hooks/language-preference';
import { ThemePreferenceProvider, useThemePreference } from '@/hooks/theme-preference';

export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <LanguagePreferenceProvider>
          <RootNavigator />
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { resolvedScheme } = useThemePreference();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();

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
              tabBarActiveTintColor: DesignColors.primary,
              tabBarInactiveTintColor: DesignColors.inkMuted,
              tabBarShowLabel: true,
              tabBarStyle: {
                backgroundColor: DesignColors.surface1,
                borderTopColor: DesignColors.hairline,
                height: 78,
                paddingBottom: 12,
                paddingTop: 6,
              },
              tabBarLabelStyle: {
                ...Typography.caption,
                marginBottom: 6,
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
                  return (
                    <Ionicons
                      name={focused ? 'map' : 'map-outline'}
                      size={iconSize}
                      color={color}
                    />
                  );
                }
                if (route.name === '(customer)/flow') {
                  return (
                    <Ionicons
                      name={focused ? 'git-network' : 'git-network-outline'}
                      size={iconSize}
                      color={color}
                    />
                  );
                }
                if (route.name === '(customer)/profile') {
                  return (
                    <Ionicons
                      name={focused ? 'person' : 'person-outline'}
                      size={iconSize}
                      color={color}
                    />
                  );
                }
                if (route.name === '(customer)/settings') {
                  return (
                    <Ionicons
                      name={focused ? 'settings' : 'settings-outline'}
                      size={iconSize}
                      color={color}
                    />
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
            <Tabs.Screen name="(customer)/home_check1" options={{ title: t('Trang chủ 1', 'Home') }} />
            <Tabs.Screen name="(customer)/home_check2" options={{ title: t('Trang chủ 2', 'Homeless') }} />
            <Tabs.Screen name="(customer)/parking-map" options={{ title: t('Bản đồ', 'Map') }} />
            <Tabs.Screen name="(customer)/flow" options={{ title: t('Luồng', 'Flow') }} />
            <Tabs.Screen name="(customer)/profile" options={{ title: t('Hồ sơ', 'Profile') }} />
            <Tabs.Screen name="(customer)/settings" options={{ href: null }} />
            <Tabs.Screen name="(manager)/manager" options={{ href: null }} />
            <Tabs.Screen
              name="(staff)/staff"
              options={{ href: null, tabBarStyle: { display: 'none' } }}
            />
            <Tabs.Screen name="(customer)/driver" options={{ href: null }} />
            <Tabs.Screen name="(admin)/admin" options={{ href: null }} />
          </Tabs>
        </AppToastProvider>
      </SafeAreaView>
    </ThemeProvider>
  );
}
