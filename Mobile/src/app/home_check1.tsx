import React, { useEffect, useMemo, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, Dimensions, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useThemePreference, type ThemePreference } from '@/hooks/theme-preference';
import { MaxContentWidth } from '@/constants/theme';

export default function HomeScreen() {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const { t, language, setLanguage } = useLanguagePreference();
  const { themePreference, setThemePreference } = useThemePreference();
  const kpis = useMemo(() => getKpis(DesignColors, t), [DesignColors, t]);
  const roleShortcuts = useMemo(() => getRoleShortcuts(t), [t]);
  const router = useRouter();
  const drawerWidth = useMemo(() => Math.round(Dimensions.get('window').width * 0.68), []);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = React.useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = React.useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const themeDropdownAnim = useRef(new Animated.Value(0)).current;
  const languageDropdownAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const livePulse = useRef(new Animated.Value(0)).current;
  const floatDrift = useRef(new Animated.Value(0)).current;
  const sectionAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const reveal = Animated.stagger(
      90,
      sectionAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }),
      ),
    );
    reveal.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatDrift, {
          toValue: 1,
          duration: 2800,
          useNativeDriver: true,
        }),
        Animated.timing(floatDrift, {
          toValue: 0,
          duration: 2800,
          useNativeDriver: true,
        }),
      ]),
    );
    driftLoop.start();

    return () => {
      pulseLoop.stop();
      driftLoop.stop();
    };
  }, [floatDrift, livePulse, sectionAnims]);

  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: menuOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [menuAnim, menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      setThemeDropdownOpen(false);
      setLanguageDropdownOpen(false);
    }
  }, [menuOpen]);

  useEffect(() => {
    Animated.timing(themeDropdownAnim, {
      toValue: themeDropdownOpen ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [themeDropdownAnim, themeDropdownOpen]);

  useEffect(() => {
    Animated.timing(languageDropdownAnim, {
      toValue: languageDropdownOpen ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [languageDropdownAnim, languageDropdownOpen]);

  const themeOptions: Array<{ key: ThemePreference; label: string }> = [
    { key: 'system', label: t('Theo thiết bị', 'System') },
    { key: 'dark', label: t('Tối', 'Dark') },
    { key: 'light', label: t('Sáng', 'Light') },
  ];

  const languageOptions: Array<{ key: 'vi' | 'en'; label: string }> = [
    { key: 'vi', label: 'Tiếng Việt' },
    { key: 'en', label: 'English' },
  ];

  const sectionStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  });

  const topBarLift = {
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, 180],
          outputRange: [0, -10],
          extrapolate: 'clamp',
        }),
      },
    ],
    opacity: scrollY.interpolate({
      inputRange: [0, 180],
      outputRange: [1, 0.92],
      extrapolate: 'clamp',
    }),
  };

  const liveBadgePulse = {
    transform: [
      {
        scale: livePulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.06],
        }),
      },
    ],
    opacity: livePulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.84, 1],
    }),
  };

  const floatingCard = (phase: number) => ({
    transform: [
      {
        translateY: floatDrift.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [phase, -phase, phase],
        }),
      },
    ],
  });

  return (
    <ThemedView style={styles.container}>
      <Animated.View
        pointerEvents={menuOpen ? 'auto' : 'none'}
        style={[
          styles.menuBackdrop,
          {
            opacity: menuAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.48],
            }),
          },
        ]}
      >
        <Pressable style={styles.menuBackdropPressable} onPress={() => setMenuOpen(false)} />
      </Animated.View>
      <Animated.View
        pointerEvents={menuOpen ? 'auto' : 'none'}
        style={[
          styles.menuDrawer,
          {
            transform: [
              {
                translateX: menuAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-(drawerWidth + 24), 0],
                }),
              },
            ],
          },
          { width: drawerWidth },
        ]}
      >

        <ThemedText style={{ fontWeight: 'bold' }}>
            <>{t('Xin chào,', 'Welcome,')} Toi an cut</>
        </ThemedText>
        <View style={styles.menuList}>
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              router.push('/parking-map');
            }}
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          >
            <Ionicons name="map-outline" size={17} color={DesignColors.ink} />
            <ThemedText style={styles.menuItemText}>{t('Mở bản đồ 3D', 'Open 3D map')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              router.push('/flow');
            }}
            style={({ pressed }) => [styles.menuItem, styles.menuItemLast, pressed && styles.menuItemPressed]}
          >
            <Ionicons name="git-network-outline" size={17} color={DesignColors.ink} />
            <ThemedText style={styles.menuItemText}>{t('Luồng hệ thống', 'System flow')}</ThemedText>
          </Pressable>
        </View>

        <View style={styles.dropdownGroup}>
          <Pressable
            onPress={() => setThemeDropdownOpen((v) => !v)}
            style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.dropdownPressed]}
          >
            <ThemedText style={styles.dropdownLabel}>
              {t('Giao diện', 'Appearance')}: {themeOptions.find((o) => o.key === themePreference)?.label}
            </ThemedText>
            <Ionicons
              name={themeDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={DesignColors.inkMuted}
            />
          </Pressable>
          <Animated.View
            style={[
              styles.dropdownUnderLine,
              {
                opacity: themeDropdownOpen ? 0 : 1,
                transform: [
                  {
                    translateY: themeDropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 4],
                    }),
                  },
                ],
              },
            ]}
          />
          {themeDropdownOpen && (
            <Animated.View
              style={[
                styles.dropdownMenu,
                {
                  opacity: themeDropdownAnim,
                  transform: [
                    {
                      translateY: themeDropdownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-6, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {themeOptions.map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => setThemePreference(option.key)}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    themePreference === option.key && styles.dropdownOptionActive,
                    pressed && styles.dropdownPressed,
                  ]}
                >
                  <ThemedText style={styles.dropdownOptionText}>{option.label}</ThemedText>
                </Pressable>
              ))}
            </Animated.View>
          )}
        </View>

        <View style={styles.dropdownGroup}>
          <Pressable
            onPress={() => setLanguageDropdownOpen((v) => !v)}
            style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.dropdownPressed]}
          >
            <ThemedText style={styles.dropdownLabel}>
              {t('Ngôn ngữ', 'Language')}: {languageOptions.find((o) => o.key === language)?.label}
            </ThemedText>
            <Ionicons
              name={languageDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={DesignColors.inkMuted}
            />
          </Pressable>
          <Animated.View
            style={[
              styles.dropdownUnderLine,
              {
                opacity: languageDropdownOpen ? 0 : 1,
                transform: [
                  {
                    translateY: languageDropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 4],
                    }),
                  },
                ],
              },
            ]}
          />
          {languageDropdownOpen && (
            <Animated.View
              style={[
                styles.dropdownMenu,
                {
                  opacity: languageDropdownAnim,
                  transform: [
                    {
                      translateY: languageDropdownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-6, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {languageOptions.map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => setLanguage(option.key)}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    language === option.key && styles.dropdownOptionActive,
                    pressed && styles.dropdownPressed,
                  ]}
                >
                  <ThemedText style={styles.dropdownOptionText}>{option.label}</ThemedText>
                </Pressable>
              ))}
            </Animated.View>
          )}
        </View>
      </Animated.View>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        <Animated.View style={[styles.topBar, sectionStyle(sectionAnims[0]), topBarLift]}>
          <View style={styles.leftHead}>
            <View>
              <ThemedText style={styles.eyebrow}>PARKASE</ThemedText>
              <ThemedText style={styles.pageTitle}>{t('Trang chủ', 'Home')}</ThemedText>
              <ThemedText style={styles.pageSubtitle}>
                {t('Bảng điều khiển vận hành trong ngày', 'Daily operations dashboard')}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => setMenuOpen((v) => !v)}
              style={styles.menuToggleRail}
            >
              {({ pressed }) => (
                <View style={styles.menuRailStack}>
                  <View style={[styles.menuRailLine, pressed && styles.menuRailLinePressed]} />
                  <View style={[styles.menuRailLine, pressed && styles.menuRailLinePressed]} />
                  <View style={[styles.menuRailLine, pressed && styles.menuRailLinePressed]} />
                </View>
              )}
            </Pressable>
          </View>
          <Animated.View style={[styles.liveBadge, liveBadgePulse]}>
            <View style={styles.liveDot} />
            <ThemedText style={styles.liveText}>{t('Trực tiếp', 'Live')}</ThemedText>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.overviewCard, sectionStyle(sectionAnims[1]), floatingCard(2)]}>
          <ThemedText style={styles.cardTitle}>{t('Tổng quan', 'Quick overview')}</ThemedText>
          <View style={styles.kpiGrid}>
            {kpis.map((item) => (
              <View key={item.nhan} style={styles.kpiCard}>
                <View style={styles.kpiRow}>
                  <View style={[styles.kpiDot, { backgroundColor: item.tone }]} />
                  <ThemedText style={styles.kpiLabel}>{item.nhan}</ThemedText>
                </View>
                <ThemedText style={styles.kpiValue}>{item.giaTri}</ThemedText>
                <ThemedText style={styles.kpiHint}>{item.goiy}</ThemedText>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.quickCard, sectionStyle(sectionAnims[2]), floatingCard(1.6)]}>
          <ThemedText style={styles.cardTitle}>{t('Truy cập', 'Quick access')}</ThemedText>
          <View style={styles.quickGrid}>
            {roleShortcuts.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.route as never)}
                style={({ pressed }) => [styles.quickButton, pressed && styles.quickButtonPressed]}
              >
                <ThemedText style={styles.quickLabel}>{item.label}</ThemedText>
                <ThemedText style={styles.quickMeta}>{item.meta}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.timelineCard, sectionStyle(sectionAnims[3]), floatingCard(1.2)]}>
          <View style={styles.timelineHeader}>
            <ThemedText style={styles.cardTitle}>{t('Hoạt động hôm nay', 'Today activity')}</ThemedText>
            <ThemedText style={styles.timelineTag}>{t('Thời gian thực', 'Realtime')}</ThemedText>
          </View>
          <View style={styles.timelineItem}>
            <ThemedText style={styles.timelineTime}>09:12</ThemedText>
            <ThemedText style={styles.timelineText}>
              {t('Cổng vào cao điểm 38 xe / 10 phút', 'Entry gate peak 38 vehicles / 10 min')}
            </ThemedText>
          </View>
          <View style={styles.timelineItem}>
            <ThemedText style={styles.timelineTime}>11:05</ThemedText>
            <ThemedText style={styles.timelineText}>
              {t('Tầng T3 đạt 92% công suất', 'T3 floor reached 92% capacity')}
            </ThemedText>
          </View>
          <View style={styles.timelineItem}>
            <ThemedText style={styles.timelineTime}>14:40</ThemedText>
            <ThemedText style={styles.timelineText}>
              {t('3 chỗ vừa được đặt lịch cho khung 16:00', '3 spots were booked for 16:00')}
            </ThemedText>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const getKpis = (DesignColors: DesignColorPalette, t: (vi: string, en: string) => string) => [
  {
    nhan: t('Công suất', 'Occupancy'),
    giaTri: '84%',
    goiy: t('482 / 574 chỗ', '482 / 574 slots'),
    tone: DesignColors.semanticSuccess,
  },
  {
    nhan: t('Phiên đang mở', 'Open sessions'),
    giaTri: '311',
    goiy: t('21 phiên sắp kết thúc', '21 sessions ending soon'),
    tone: DesignColors.primary,
  },
  {
    nhan: t('Lưu lượng cổng', 'Gate throughput'),
    giaTri: '71/h',
    goiy: t('trung bình 1 giờ', 'average in last hour'),
    tone: '#3b82f6',
  },
  {
    nhan: t('Cảnh báo hoạt động', 'Active alerts'),
    giaTri: '3',
    goiy: t('1 cảnh báo mức cao', '1 high-priority alert'),
    tone: '#f97316',
  },
];

const getRoleShortcuts = (t: (vi: string, en: string) => string) => [
  { label: t('Quản lý', 'Manager'), meta: t('Bảng điều hành cơ sở', 'Facility dashboard'), route: '/manager' },
  { label: t('Nhân viên', 'Staff'), meta: t('Quầy + tuần tra', 'Booth + patrol'), route: '/staff' },
  { label: t('Tài xế', 'Driver'), meta: t('Theo dõi phiên gửi', 'Session view'), route: '/driver' },
  { label: t('Quản trị', 'Admin'), meta: t('Bảng điều khiển', 'Control panel'), route: '/admin' },
];

const createStyles = (DesignColors: DesignColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignColors.canvas,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.section,
    paddingBottom: Spacing.section,
    gap: Spacing.md,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  leftHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  menuToggleRail: {
    width: 54,
    height: 30,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRailStack: {
    width: 18,
    gap: 4,
  },
  menuRailLine: {
    width: '100%',
    height: 2,
    borderRadius: Radius.pill,
    backgroundColor: DesignColors.inkMuted,
  },
  menuRailLinePressed: {
    backgroundColor: DesignColors.primary,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DesignColors.semanticOverlay,
    zIndex: 7,
  },
  menuBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  menuDrawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: DesignColors.surface1,
    borderRightWidth: 1,
    borderRightColor: DesignColors.hairlineStrong,
    paddingTop: 88,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    zIndex: 8,
  },
  menuList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: DesignColors.hairlineStrong,
    borderBottomColor: DesignColors.hairlineStrong,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: DesignColors.hairline,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  menuItemPressed: {
    backgroundColor: DesignColors.surface2,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    ...Typography.bodySm,
    color: DesignColors.ink,
  },
  dropdownGroup: {
    gap: 0,
    borderBottomWidth: 0,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dropdownUnderLine: {
    height: 1,
    backgroundColor: DesignColors.hairline,
  },
  dropdownMenu: {
    marginTop: 0,
    borderTopWidth: 1,
    borderTopColor: DesignColors.hairline,
    borderBottomWidth: 0,
  },
  dropdownOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: DesignColors.hairline,
  },
  dropdownOptionActive: {
    backgroundColor: DesignColors.surface2,
  },
  dropdownPressed: {
    opacity: 0.72,
  },
  dropdownLabel: {
    ...Typography.bodySm,
    color: DesignColors.ink,
  },
  dropdownOptionText: {
    ...Typography.bodySm,
    color: DesignColors.ink,
  },
  eyebrow: {
    ...Typography.eyebrow,
    textTransform: 'uppercase',
    color: DesignColors.inkSubtle,
  },
  pageTitle: {
    ...Typography.headline,
    color: DesignColors.ink,
  },
  pageSubtitle: {
    ...Typography.caption,
    color: DesignColors.inkMuted,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: DesignColors.hairlineStrong,
    backgroundColor: DesignColors.surface1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: DesignColors.semanticSuccess,
  },
  liveText: {
    ...Typography.caption,
    color: DesignColors.inkMuted,
  },
  overviewCard: {
    backgroundColor: DesignColors.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardTitle: {
    ...Typography.cardTitle,
    color: DesignColors.ink,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  kpiCard: {
    flexBasis: '48%',
    backgroundColor: DesignColors.surface2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    padding: Spacing.sm,
    gap: Spacing.xxs,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  kpiDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.pill,
  },
  kpiLabel: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  kpiValue: {
    ...Typography.subhead,
    color: DesignColors.ink,
  },
  kpiHint: {
    ...Typography.caption,
    color: DesignColors.inkMuted,
  },
  kpiFootnote: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
    marginTop: Spacing.xs,
  },
  quickCard: {
    backgroundColor: DesignColors.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickButton: {
    flexBasis: '48%',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    padding: Spacing.sm,
    gap: 2,
  },
  quickButtonPressed: {
    borderColor: DesignColors.primary,
    backgroundColor: DesignColors.surface3,
  },
  quickLabel: {
    ...Typography.bodySm,
    color: DesignColors.ink,
    fontWeight: 600,
  },
  quickMeta: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  timelineCard: {
    backgroundColor: DesignColors.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTag: {
    ...Typography.caption,
    color: DesignColors.primary,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  timelineTime: {
    ...Typography.mono,
    color: DesignColors.inkSubtle,
    minWidth: 42,
  },
  timelineText: {
    ...Typography.bodySm,
    color: DesignColors.inkMuted,
    flex: 1,
  },
});