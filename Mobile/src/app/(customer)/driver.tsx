import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { MaxContentWidth } from '@/constants/theme';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

const getAvailability = (t: (vi: string, en: string) => string) => [
  [t('B1 Cao cấp', 'B1 Premium'), 12, 60],
  [t('B2 Tiêu chuẩn', 'B2 Standard'), 38, 120],
  ['B3 EV', 32, 40],
  [t('L1 Ngoài trời', 'L1 Outdoor'), 10, 354],
];

const getInvoices = () => [
  ['INV-8921', 'Nov 14', '$12.00'],
  ['INV-8910', 'Nov 09', '$45.50'],
  ['INV-8898', 'Nov 03', '$18.20'],
];

export default function DriverScreen() {
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const availability = useMemo(() => getAvailability(t), [t]);
  const invoices = useMemo(() => getInvoices(), []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>{t('Vai trò 03 - Tài xế', 'Role 03 - Driver')}</ThemedText>
          <ThemedText style={styles.title}>{t('Phiên gửi xe di động', 'Mobile session')}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {t(
              'Theo dõi thời gian thực, hướng dẫn chỗ đỗ và QR ra cổng ngay trên điện thoại.',
              'Live timer, slot guidance, and exit QR without leaving the phone.',
            )}
          </ThemedText>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <ThemedText style={styles.caption}>{t('Chào mừng quay lại', 'Welcome back')}</ThemedText>
              <ThemedText style={styles.cardTitle}>Alex Tran</ThemedText>
            </View>
            <View style={styles.walletBadge}>
              <ThemedText style={styles.walletText}>{t('$24.50 - Ví', '$24.50 - Wallet')}</ThemedText>
            </View>
          </View>
          <View style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <View style={styles.activeBadge}>
                <ThemedText style={styles.activeBadgeText}>{t('ĐANG GỬI', 'ACTIVE')}</ThemedText>
              </View>
              <ThemedText style={styles.activeSlot}>Slot B2-047</ThemedText>
            </View>
            <ThemedText style={styles.activeTimer}>01:42:15</ThemedText>
            <ThemedText style={styles.activeDetail}>{t('Phí dự kiến - $8.50', 'Estimated fee - $8.50')}</ThemedText>
            <View style={styles.actionRow}>
              <View style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>{t('Chỉ đường', 'Directions')}</ThemedText>
              </View>
              <View style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>{t('Gia hạn', 'Extend')}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.eyebrow}>{t('Lộ trình', 'Route')}</ThemedText>
          <View style={styles.mapCard}>
            <View style={styles.mapLine} />
            <View style={styles.mapPinRow}>
              <View style={styles.mapPin} />
              <ThemedText style={styles.mapText}>{t('Lộ trình AI tới B2-047', 'AI route to B2-047')}</ThemedText>
            </View>
            <ThemedText style={styles.mapDetail}>{t('Đi bộ 4 phút - Thang máy B', '4 min walk - Elevator B')}</ThemedText>
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.eyebrow}>{t('QR ra cổng', 'Exit QR')}</ThemedText>
          <View style={styles.qrRow}>
            <View style={styles.qrBlock} />
            <View style={styles.qrText}>
              <ThemedText style={styles.cardTitle}>{t('QR cổng ra', 'Gate QR')}</ThemedText>
              <ThemedText style={styles.cardDetail}>{t('Hiệu lực đến 22:00', 'Valid until 22:00')}</ThemedText>
              <View style={styles.primaryButton}>
                <ThemedText style={styles.primaryButtonText}>Apple Pay</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.eyebrow}>{t('Chỗ trống thời gian thực', 'Live availability')}</ThemedText>
          <View style={styles.list}>
            {availability.map(([label, free, total]) => {
              const percent = ((Number(total) - Number(free)) / Number(total)) * 100;
              return (
                <View key={label} style={styles.availabilityRow}>
                  <View style={styles.availabilityHeader}>
                    <ThemedText style={styles.availabilityLabel}>{label}</ThemedText>
                    <ThemedText style={styles.availabilityMeta}>
                      {free}/{total}
                    </ThemedText>
                  </View>
                  <View style={styles.availabilityTrack}>
                    <View style={[styles.availabilityFill, { width: `${percent}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <ThemedText style={styles.cardTitle}>{t('Hóa đơn gần đây', 'Recent invoices')}</ThemedText>
            <ThemedText style={styles.caption}>{t('Tải tất cả', 'Download all')}</ThemedText>
          </View>
          <View style={styles.list}>
            {invoices.map(([id, date, value]) => (
              <View key={id} style={styles.invoiceRow}>
                <View>
                  <ThemedText style={styles.invoiceId}>{id}</ThemedText>
                  <ThemedText style={styles.invoiceDate}>{date}</ThemedText>
                </View>
                <ThemedText style={styles.invoiceValue}>{value}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignColors.canvas,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.section,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.xs,
  },
  eyebrow: {
    ...Typography.eyebrow,
    textTransform: 'uppercase',
    color: DesignColors.inkSubtle,
  },
  title: {
    ...Typography.displayMd,
    color: DesignColors.ink,
  },
  subtitle: {
    ...Typography.body,
    color: DesignColors.inkMuted,
  },
  card: {
    backgroundColor: DesignColors.surface1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...Typography.cardTitle,
    color: DesignColors.ink,
  },
  cardDetail: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  caption: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  walletBadge: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  walletText: {
    ...Typography.caption,
    color: DesignColors.ink,
  },
  activeCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeBadge: {
    borderRadius: Radius.pill,
    backgroundColor: DesignColors.surface1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  activeBadgeText: {
    ...Typography.caption,
    color: DesignColors.primary,
    textTransform: 'uppercase',
  },
  activeSlot: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  activeTimer: {
    ...Typography.headline,
    color: DesignColors.ink,
  },
  activeDetail: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...Typography.button,
    color: DesignColors.ink,
  },
  mapCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  mapLine: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: DesignColors.hairlineStrong,
  },
  mapPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mapPin: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: DesignColors.primary,
  },
  mapText: {
    ...Typography.bodySm,
    color: DesignColors.ink,
  },
  mapDetail: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  qrRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  qrBlock: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
  },
  qrText: {
    flex: 1,
    gap: Spacing.xs,
  },
  primaryButton: {
    borderRadius: Radius.md,
    backgroundColor: DesignColors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    ...Typography.button,
    color: DesignColors.onPrimary,
  },
  list: {
    gap: Spacing.sm,
  },
  availabilityRow: {
    gap: Spacing.xs,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityLabel: {
    ...Typography.bodySm,
    color: DesignColors.ink,
  },
  availabilityMeta: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  availabilityTrack: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: DesignColors.surface2,
    overflow: 'hidden',
  },
  availabilityFill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: DesignColors.primary,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    padding: Spacing.sm,
  },
  invoiceId: {
    ...Typography.mono,
    color: DesignColors.ink,
  },
  invoiceDate: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  invoiceValue: {
    ...Typography.bodySm,
    fontWeight: 600,
    color: DesignColors.ink,
  },
});
