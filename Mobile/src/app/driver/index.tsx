import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DriverAppBar } from '@/components/driver/driver-app-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

const PRICING_ROWS = [
  { durationVi: 'Giờ đầu', durationEn: 'First Hour', rate: '$500.00' },
  { durationVi: '2 - 4 giờ', durationEn: '2 - 4 Hours', rate: '$1200.00' },
  { durationVi: 'Tối đa/ngày', durationEn: 'Daily Max', rate: '$0.00' },
];

/** parkos_unified_app_final_fixed — HOME TAB (SCREEN_126) */
export default function DriverHomeScreen() {
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <ThemedView style={styles.container}>
      <DriverAppBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>{t('Chào mừng trở lại, BAO', 'Welcome back, BAO')}</ThemedText>
          <ThemedText style={styles.title}>{t('Trang chủ', 'Home')}</ThemedText>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View>
              <ThemedText style={styles.cardTitle}>Parking Center</ThemedText>
              <ThemedText style={styles.cardSubtitle}>{t('Khu công nghệ cao', 'High-tech zone')}</ThemedText>
            </View>
            <View style={styles.liveBadge}>
              <ThemedText style={styles.liveBadgeText}>LIVE</ThemedText>
            </View>
          </View>

          <View style={styles.spotsRow}>
            <View>
              <ThemedText style={styles.metaLabel}>{t('Chỗ trống', 'Available Spots')}</ThemedText>
              <ThemedText style={styles.spotsValue}>124</ThemedText>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '72%' }]} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <ThemedText style={styles.metaLabel}>{t('Tổng', 'Total')}</ThemedText>
              <ThemedText style={styles.statValue}>450</ThemedText>
            </View>
            <View style={styles.statCell}>
              <ThemedText style={styles.metaLabel}>{t('Đã chiếm', 'Occupied')}</ThemedText>
              <ThemedText style={styles.statValue}>326</ThemedText>
            </View>
            <View style={styles.statCell}>
              <ThemedText style={styles.metaLabel}>{t('Sử dụng', 'Utilization')}</ThemedText>
              <ThemedText style={[styles.statValue, styles.successText]}>72%</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('Bảng giá', 'Pricing Table')}</ThemedText>
          <View style={styles.tableCard}>
            <View style={styles.tableHead}>
              <ThemedText style={styles.tableHeadCell}>{t('Thời lượng', 'Duration')}</ThemedText>
              <ThemedText style={[styles.tableHeadCell, styles.alignRight]}>
                {t('Đơn giá', 'Rate')}
              </ThemedText>
            </View>
            {PRICING_ROWS.map((row) => (
              <View key={row.durationEn} style={styles.tableRow}>
                <ThemedText style={styles.tableCell}>{t(row.durationVi, row.durationEn)}</ThemedText>
                <ThemedText style={[styles.tableCell, styles.rateCell]}>{row.rate}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: DesignColors.canvas },
    content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xl },
    header: { gap: 4 },
    eyebrow: {
      ...Typography.eyebrow,
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: DesignColors.inkSubtle,
    },
    title: {
      fontSize: 30,
      fontWeight: '700',
      lineHeight: 36,
      color: DesignColors.ink,
    },
    card: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardTitle: { ...Typography.cardTitle, color: DesignColors.ink },
    cardSubtitle: { ...Typography.bodySm, color: DesignColors.inkSubtle },
    liveBadge: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: `${DesignColors.semanticSuccess}33`,
      backgroundColor: `${DesignColors.semanticSuccess}1A`,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    liveBadgeText: {
      ...Typography.caption,
      fontWeight: '600',
      color: DesignColors.semanticSuccess,
    },
    spotsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.lg },
    metaLabel: { ...Typography.caption, color: DesignColors.inkSubtle },
    spotsValue: {
      fontSize: 30,
      fontWeight: '700',
      lineHeight: 38,
      color: DesignColors.primary,
    },
    progressTrack: {
      flex: 1,
      height: 8,
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.surface2,
      overflow: 'hidden',
      marginBottom: 6,
    },
    progressFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: DesignColors.primary },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
      paddingTop: Spacing.md,
    },
    statCell: { alignItems: 'center', flex: 1 },
    statValue: { ...Typography.body, fontWeight: '500', color: DesignColors.ink },
    successText: { color: DesignColors.semanticSuccess },
    section: { gap: Spacing.md },
    sectionTitle: { ...Typography.cardTitle, color: DesignColors.ink },
    tableCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      overflow: 'hidden',
    },
    tableHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: DesignColors.surface2,
      borderBottomWidth: 1,
      borderBottomColor: DesignColors.hairline,
    },
    tableHeadCell: {
      ...Typography.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: DesignColors.inkSubtle,
    },
    alignRight: { textAlign: 'right' },
    tableRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: DesignColors.hairline,
    },
    tableCell: { ...Typography.body, color: DesignColors.ink },
    rateCell: { fontWeight: '700', lineHeight: 22, color: DesignColors.primary },
  });
