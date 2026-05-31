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

/** parkos_unified_app_final_fixed — HISTORY TAB (SCREEN_138) / l_t_g_i_hi_n_t_i_unified_theme */
export default function DriverHistoryScreen() {
  const router = useRouter();
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <ThemedView style={styles.container}>
      <DriverAppBar showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>{t('Lịch sử gửi xe', 'Parking History')}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {t('Xem và quản lý các phiên gửi xe trước đây', 'Review and manage your past parking sessions')}
          </ThemedText>
        </View>

        <View style={styles.filters}>
          <Pressable style={styles.filterChip}>
            <Ionicons color={DesignColors.ink} name="car-outline" size={16} />
            <ThemedText style={styles.filterText}>{t('Chọn xe', 'Select vehicle')}</ThemedText>
            <Ionicons color={DesignColors.inkSubtle} name="chevron-down" size={16} />
          </Pressable>
          <Pressable style={styles.filterChip}>
            <Ionicons color={DesignColors.ink} name="calendar-outline" size={16} />
            <ThemedText style={styles.filterText}>{t('Ngày gửi', 'Entry date')}</ThemedText>
            <Ionicons color={DesignColors.inkSubtle} name="chevron-down" size={16} />
          </Pressable>
          <Pressable style={styles.filterButton}>
            <Ionicons color={DesignColors.onPrimary} name="filter" size={16} />
          </Pressable>
        </View>

        <View style={styles.historyCard}>
          <View style={styles.historyTop}>
            <View style={styles.historyLeft}>
              <View style={styles.paymentIcon}>
                <Ionicons color="#ba1a1a" name="card" size={22} />
              </View>
              <View>
                <ThemedText style={styles.historyTitle}>Central Plaza Parking</ThemedText>
                <View style={styles.pendingRow}>
                  <View style={styles.pendingDot} />
                  <ThemedText style={styles.pendingText}>
                    {t('Chờ thanh toán', 'Payment Pending')}
                  </ThemedText>
                </View>
              </View>
            </View>
            <ThemedText style={styles.amount}>45.000đ</ThemedText>
          </View>

          <View style={styles.metaGrid}>
            <View>
              <ThemedText style={styles.metaLabel}>{t('Ngày vào', 'Entry Date')}</ThemedText>
              <View style={styles.metaValueRow}>
                <Ionicons color={DesignColors.primary} name="calendar-outline" size={14} />
                <ThemedText style={styles.metaValue}>{t('Hôm nay, 08:30', 'Today, 08:30 AM')}</ThemedText>
              </View>
            </View>
            <View>
              <ThemedText style={styles.metaLabel}>{t('Thời lượng', 'Duration')}</ThemedText>
              <View style={styles.metaValueRow}>
                <Ionicons color={DesignColors.primary} name="time-outline" size={14} />
                <ThemedText style={styles.metaValue}>3h 45m</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.historyFooter}>
            <ThemedText style={styles.plateTag}>51A-888.88</ThemedText>
            <Pressable
              onPress={() => router.push('/driver/payment' as never)}
              style={styles.payButton}
            >
              <ThemedText style={styles.payButtonText}>{t('Thanh toán', 'Pay')}</ThemedText>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/driver/subscription' as never)}
          style={styles.promoCard}
        >
          <ThemedText style={styles.promoTitle}>{t('Gói tháng', 'Monthly Subscription')}</ThemedText>
          <ThemedText style={styles.promoDesc}>
            {t('Tiết kiệm đến 5% mỗi lần gửi tại các bãi yêu thích.', 'Save up to 5% on parking at your favorite spots.')}
          </ThemedText>
          <View style={styles.upgradeButton}>
            <ThemedText style={styles.upgradeText}>{t('Nâng cấp ngay', 'Upgrade Now')}</ThemedText>
          </View>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: DesignColors.canvas },
    content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xl },
    header: { gap: 4 },
    title: { fontSize: 24, fontWeight: '800', color: DesignColors.ink },
    subtitle: { ...Typography.bodySm, color: DesignColors.inkSubtle },
    filters: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: DesignColors.surface1,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 10,
    },
    filterText: { ...Typography.bodySm, color: DesignColors.ink },
    filterButton: {
      backgroundColor: DesignColors.primary,
      borderRadius: Radius.md,
      padding: 10,
    },
    historyCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    historyLeft: { flexDirection: 'row', gap: Spacing.sm, flex: 1 },
    paymentIcon: {
      width: 48,
      height: 48,
      borderRadius: Radius.lg,
      backgroundColor: '#ba1a1a1A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyTitle: { ...Typography.body, fontWeight: '700', fontSize: 18, color: DesignColors.ink },
    pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    pendingDot: { width: 6, height: 6, borderRadius: Radius.pill, backgroundColor: '#ba1a1a' },
    pendingText: {
      ...Typography.caption,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: '#ba1a1a',
    },
    amount: { ...Typography.body, fontWeight: '700', fontSize: 18, color: DesignColors.ink },
    metaGrid: {
      flexDirection: 'row',
      gap: Spacing.md,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: DesignColors.hairline,
      paddingVertical: Spacing.md,
    },
    metaLabel: {
      ...Typography.caption,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: DesignColors.inkSubtle,
    },
    metaValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    metaValue: { ...Typography.bodySm, fontWeight: '600', color: DesignColors.ink },
    historyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    plateTag: {
      ...Typography.mono,
      fontSize: 10,
      fontWeight: '700',
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.xs,
      paddingVertical: 4,
      borderRadius: Radius.sm,
      color: DesignColors.ink,
    },
    payButton: {
      backgroundColor: DesignColors.primary,
      borderRadius: Radius.pill,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.xs,
    },
    payButtonText: { ...Typography.bodySm, fontWeight: '700', color: DesignColors.onPrimary },
    promoCard: {
      backgroundColor: DesignColors.primary,
      borderRadius: Radius.xxl,
      padding: Spacing.lg,
      minHeight: 128,
      justifyContent: 'center',
      gap: Spacing.xs,
    },
    promoTitle: { ...Typography.body, fontWeight: '700', fontSize: 18, color: DesignColors.onPrimary },
    promoDesc: { ...Typography.caption, color: `${DesignColors.onPrimary}CC`, maxWidth: '70%' },
    upgradeButton: {
      alignSelf: 'flex-start',
      backgroundColor: DesignColors.onPrimary,
      borderRadius: Radius.pill,
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      marginTop: Spacing.xs,
    },
    upgradeText: {
      ...Typography.caption,
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: DesignColors.primary,
    },
  });
