import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DriverAppBar } from '@/components/driver/driver-app-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { logout } from '@/lib/auth-api';

const MENU_ITEMS = [
  {
    key: 'subscription',
    icon: 'ribbon-outline' as const,
    titleVi: 'Gói hội viên',
    titleEn: 'Membership Plans',
    route: '/driver/subscription' as const,
  },
  {
    key: 'vehicles',
    icon: 'car-outline' as const,
    titleVi: 'Phương tiện của tôi',
    titleEn: 'My Vehicles',
    route: '/driver/vehicles' as const,
  },
  {
    key: 'history',
    icon: 'time-outline' as const,
    titleVi: 'Lịch sử gửi xe',
    titleEn: 'Parking History',
    route: '/driver/history' as const,
  },
  {
    key: 'settings',
    icon: 'settings-outline' as const,
    titleVi: 'Cài đặt hệ thống',
    titleEn: 'System Settings',
    route: '/driver/settings' as const,
  },
];

/** parkos_unified_app_final_fixed — PROFILE TAB / profile_adaptive_theme_fixed */
export default function DriverProfileScreen() {
  const router = useRouter();
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/sign-platform' as never);
    } catch {
      router.replace('/sign-platform' as never);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <DriverAppBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons color={DesignColors.primary} name="person" size={28} />
          </View>
          <View>
            <ThemedText style={styles.name}>Bao John</ThemedText>
            <ThemedText style={styles.member}>{t('Hội viên Tiêu chuẩn', 'Standard Member')}</ThemedText>
          </View>
        </View>

        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => router.push(item.route as never)}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            >
              <View style={styles.menuLeft}>
                <Ionicons color={DesignColors.primary} name={item.icon} size={22} />
                <ThemedText style={styles.menuLabel}>{t(item.titleVi, item.titleEn)}</ThemedText>
              </View>
              <Ionicons color={DesignColors.inkSubtle} name="chevron-forward" size={20} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
        >
          <Ionicons color="#ba1a1a" name="log-out-outline" size={20} />
          <ThemedText style={styles.logoutText}>{t('Đăng xuất', 'Log Out')}</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: DesignColors.canvas },
    content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xxl },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: Radius.pill,
      borderWidth: 2,
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: { ...Typography.cardTitle, fontSize: 20, fontWeight: '700', color: DesignColors.ink },
    member: { ...Typography.bodySm, color: DesignColors.inkSubtle },
    menu: { gap: Spacing.sm },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
    },
    menuItemPressed: { backgroundColor: DesignColors.surface2 },
    menuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    menuLabel: { ...Typography.body, fontWeight: '500', color: DesignColors.ink },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      backgroundColor: '#ba1a1a1A',
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginTop: Spacing.lg,
    },
    logoutPressed: { opacity: 0.85 },
    logoutText: { ...Typography.button, fontWeight: '700', color: '#ba1a1a' },
  });
