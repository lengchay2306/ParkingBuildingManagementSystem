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
import { useThemePreference, type ThemePreference } from '@/hooks/theme-preference';

const THEME_OPTIONS: { key: ThemePreference; icon: keyof typeof Ionicons.glyphMap; vi: string; en: string }[] = [
  { key: 'light', icon: 'sunny-outline', vi: 'Sáng', en: 'Light' },
  { key: 'dark', icon: 'moon-outline', vi: 'Tối', en: 'Dark' },
  { key: 'system', icon: 'phone-portrait-outline', vi: 'Hệ thống', en: 'System' },
];

/** parkos_unified_app_final_fixed — SETTINGS TAB (SCREEN_86) */
export default function DriverSettingsScreen() {
  const router = useRouter();
  const DesignColors = useDesignColors();
  const { t, language, setLanguage } = useLanguagePreference();
  const { themePreference, setThemePreference } = useThemePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const languageLabel = language === 'vi' ? 'Tiếng Việt' : 'English';

  return (
    <ThemedView style={styles.container}>
      <DriverAppBar showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.title}>{t('Cài đặt hệ thống', 'System Settings')}</ThemedText>

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>{t('Giao diện hệ thống', 'Appearance')}</ThemedText>
          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map((option) => {
              const active = themePreference === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setThemePreference(option.key)}
                  style={({ pressed }) => [
                    styles.themeButton,
                    active && styles.themeButtonActive,
                    pressed && styles.themePressed,
                  ]}
                >
                  <Ionicons color={DesignColors.primary} name={option.icon} size={22} />
                  <ThemedText style={styles.themeLabel}>{t(option.vi, option.en)}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>{t('Cấu hình', 'Configuration')}</ThemedText>
          <View style={styles.configCard}>
            <Pressable
              onPress={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              style={({ pressed }) => [styles.configRow, pressed && styles.configPressed]}
            >
              <View style={styles.configLeft}>
                <View style={styles.configIcon}>
                  <Ionicons color={DesignColors.primary} name="language-outline" size={20} />
                </View>
                <View>
                  <ThemedText style={styles.configTitle}>{t('Ngôn ngữ', 'Language')}</ThemedText>
                  <ThemedText style={styles.configDesc}>
                    {t('Chọn ngôn ngữ hiển thị', 'Choose display language')}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.configValue}>{languageLabel}</ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>{t('Thông tin', 'About')}</ThemedText>
          <View style={styles.configCard}>
            <View style={styles.infoRow}>
              <View style={styles.configLeft}>
                <Ionicons color={DesignColors.inkSubtle} name="information-circle-outline" size={20} />
                <ThemedText style={styles.configTitle}>{t('Phiên bản ứng dụng', 'App version')}</ThemedText>
              </View>
              <ThemedText style={styles.version}>v1.0.0</ThemedText>
            </View>
          </View>
        </View>

        <ThemedText style={styles.footer}>
          © 2026 ParkOS Driver Ecosystem.{'\n'}
          {t('Bảo lưu mọi quyền.', 'All rights reserved.')}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: DesignColors.canvas },
    content: { padding: Spacing.md, gap: Spacing.xl, paddingBottom: Spacing.xxl },
    title: { fontSize: 24, fontWeight: '700', color: DesignColors.ink },
    section: { gap: Spacing.md },
    sectionLabel: {
      ...Typography.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: DesignColors.inkSubtle,
      paddingHorizontal: Spacing.xs,
    },
    themeGrid: { flexDirection: 'row', gap: Spacing.sm },
    themeButton: {
      flex: 1,
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 2,
      borderColor: 'transparent',
      padding: Spacing.md,
    },
    themeButtonActive: { borderColor: DesignColors.primary },
    themePressed: { opacity: 0.85 },
    themeLabel: { ...Typography.bodySm, fontWeight: '500', color: DesignColors.ink },
    configCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      overflow: 'hidden',
    },
    configRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.md,
    },
    configPressed: { backgroundColor: DesignColors.surface2 },
    configLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    configIcon: {
      width: 40,
      height: 40,
      borderRadius: Radius.pill,
      backgroundColor: `${DesignColors.primary}1A`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    configTitle: { ...Typography.bodySm, fontWeight: '600', color: DesignColors.ink },
    configDesc: { ...Typography.caption, fontSize: 11, color: DesignColors.inkSubtle },
    configValue: { ...Typography.bodySm, fontWeight: '700', color: DesignColors.primary },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.md,
    },
    version: { ...Typography.caption, color: DesignColors.inkSubtle },
    footer: {
      ...Typography.caption,
      fontSize: 10,
      textAlign: 'center',
      color: DesignColors.inkSubtle,
      paddingTop: Spacing.lg,
    },
  });
