import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference, type AppLanguage } from '@/hooks/language-preference';
import { useThemePreference, type ThemePreference } from '@/hooks/theme-preference';

const getThemeOptions = (t: (vi: string, en: string) => string) =>
  [
    { key: 'system' as const, title: t('Theo thiết bị', 'System') },
    { key: 'dark' as const, title: t('Tối', 'Dark') },
    { key: 'light' as const, title: t('Sáng', 'Light') },
  ] satisfies { key: ThemePreference; title: string }[];

export default function SettingsScreen() {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const { language, setLanguage, t } = useLanguagePreference();
  const { themePreference, resolvedScheme, setThemePreference } = useThemePreference();
  const themeOptions = useMemo(() => getThemeOptions(t), [t]);
  const languageOptions: { key: AppLanguage; title: string }[] = [
    { key: 'vi', title: 'Tiếng Việt' },
    { key: 'en', title: 'English' },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{t('Định dạng hiển thị', 'Display format')}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {t('Chọn giao diện tối, sáng, hoặc theo thiết bị.', 'Choose dark, light, or system mode.')}
        </ThemedText>
        <ThemedText style={styles.runtimeInfo}>
          {t('Đang chọn', 'Current')}: {themePreference.toUpperCase()} ·{' '}
          {t('Đang hiển thị', 'Resolved')}: {resolvedScheme.toUpperCase()}
        </ThemedText>
      </View>

      <View style={styles.card}>
        {themeOptions.map((item) => {
          const active = themePreference === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setThemePreference(item.key)}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={styles.optionHead}>
                <ThemedText style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {item.title}
                </ThemedText>
                <View style={[styles.radio, active && styles.radioActive]} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.header}>
        <ThemedText style={styles.title}>{t('Ngôn ngữ', 'Language')}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {t('Chuyển nhanh giữa tiếng Việt và tiếng Anh.', 'Switch between Vietnamese and English.')}
        </ThemedText>
      </View>

      <View style={styles.card}>
        {languageOptions.map((item) => {
          const active = language === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setLanguage(item.key)}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={styles.optionHead}>
                <ThemedText style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {item.title}
                </ThemedText>
                <View style={[styles.radio, active && styles.radioActive]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignColors.canvas,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  title: {
    ...Typography.headline,
    color: DesignColors.ink,
  },
  subtitle: {
    ...Typography.bodySm,
    color: DesignColors.inkMuted,
  },
  runtimeInfo: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface1,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignColors.hairline,
  },
  optionPressed: {
    backgroundColor: DesignColors.surface2,
  },
  optionActive: {
    backgroundColor: DesignColors.surface3,
  },
  optionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  optionTitle: {
    ...Typography.button,
    color: DesignColors.ink,
  },
  optionTitleActive: {
    color: DesignColors.primaryHover,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: DesignColors.hairlineStrong,
    backgroundColor: 'transparent',
  },
  radioActive: {
    borderColor: DesignColors.primary,
    backgroundColor: DesignColors.primary,
  },
});
