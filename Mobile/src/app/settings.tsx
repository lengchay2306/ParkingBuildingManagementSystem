import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference, type AppLanguage } from '@/hooks/language-preference';
import { useThemePreference, type ThemePreference } from '@/hooks/theme-preference';

const OPTIONS: { key: ThemePreference; title: string; desc: string }[] = [
  { key: 'system', title: 'Theo thiet bi', desc: 'Tu dong dong bo theo he thong' },
  { key: 'dark', title: 'Toi', desc: 'Nen toi, chuan theo DESIGN.md' },
  { key: 'light', title: 'Sang', desc: 'Nen sang, de doc ngoai troi' },
];

export default function SettingsScreen() {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const { language, setLanguage, t } = useLanguagePreference();
  const { themePreference, resolvedScheme, setThemePreference } = useThemePreference();
  const languageOptions: { key: AppLanguage; title: string; desc: string }[] = [
    { key: 'vi', title: 'Tiếng Việt', desc: 'Hiển thị toàn bộ giao diện bằng tiếng Việt' },
    { key: 'en', title: 'English', desc: 'Display the interface in English' },
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
        {OPTIONS.map((item) => {
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
              <ThemedText style={styles.optionDesc}>{item.desc}</ThemedText>
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
              <ThemedText style={styles.optionDesc}>{item.desc}</ThemedText>
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
    gap: 6,
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
  optionDesc: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
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
