import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useRequireRole } from '@/hooks/use-protected-session';

export default function DriverLayout() {
  useRequireRole('CUSTOMER');

  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const insets = useSafeAreaInsets();
  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: DesignColors.canvas,
      borderTopColor: DesignColors.hairline,
      height: 72 + insets.bottom,
      paddingBottom: Math.max(insets.bottom, 10),
      paddingTop: 8,
    }),
    [DesignColors.canvas, DesignColors.hairline, insets.bottom],
  );

  return (
    <View style={[styles.root, { backgroundColor: DesignColors.canvas }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: DesignColors.primary,
          tabBarInactiveTintColor: DesignColors.inkSubtle,
          tabBarStyle,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            lineHeight: 14,
            marginTop: 2,
            marginBottom: 2,
          },
          tabBarIconStyle: {
            marginBottom: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('Trang chủ', 'Home'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons color={color} name={focused ? 'home' : 'home-outline'} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="booking"
          options={{
            title: t('Đặt chỗ', 'Booking'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons color={color} name={focused ? 'car' : 'car-outline'} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="session"
          options={{
            title: t('Phiên gửi', 'My Session'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons color={color} name={focused ? 'timer' : 'timer-outline'} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('Hồ sơ', 'Profile'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons color={color} name={focused ? 'person' : 'person-outline'} size={22} />
            ),
          }}
        />
        <Tabs.Screen name="session-detail" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="payment" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="vehicles" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="register" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="subscription" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="history" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="settings" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
