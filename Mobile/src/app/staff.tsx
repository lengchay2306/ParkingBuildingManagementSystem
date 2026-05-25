import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { MaxContentWidth } from '@/constants/theme';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

const recentSessions = [
  ['SES-19204', '51K-298.74', 'B2-047', 'IN-USE', '00:42'],
  ['SES-19201', '51H-204.81', 'B2-031', 'CLOSED', '01:18'],
  ['SES-19199', '29C-009.55', 'B3-007', 'CLOSED', '02:46'],
];

const getQuickActions = (t: (vi: string, en: string) => string) => [
  t('Mất thẻ', 'Lost card'),
  t('Sửa biển số', 'Plate fix'),
  t('Sai khu vực', 'Wrong zone'),
  t('Trạng thái ô', 'Slot status'),
];

export default function StaffScreen() {
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const quickActions = useMemo(() => getQuickActions(t), [t]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>{t('Vai trò 02 - Nhân viên bãi', 'Role 02 - Parking Staff')}</ThemedText>
          <ThemedText style={styles.title}>{t('Thiết bị tuần tra', 'Handheld patrol')}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {t(
              'Tra cứu phiên gửi, xác nhận ra cổng và xử lý ngoại lệ nhanh chỉ với một tay.',
              'One-handed session lookup, exit confirmation, and quick exceptions.',
            )}
          </ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.eyebrow}>{t('Tìm phiên gửi', 'Find session')}</ThemedText>
          <View style={styles.searchRow}>
            <ThemedText style={styles.searchIcon}>SEARCH</ThemedText>
            <ThemedText style={styles.searchValue}>51K-298.74</ThemedText>
          </View>
          <View style={styles.actionRow}>
            <View style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>{t('Quét biển số', 'Scan plate')}</ThemedText>
            </View>
            <View style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>{t('Mã QR', 'QR code')}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionBadge}>
              <ThemedText style={styles.sessionBadgeText}>{t('KHỚP - ĐANG GỬI', 'MATCH - IN-USE')}</ThemedText>
            </View>
            <ThemedText style={styles.sessionId}>SES-19204</ThemedText>
          </View>
          <ThemedText style={styles.sessionPlate}>51K-298.74</ThemedText>
          <ThemedText style={styles.sessionDetail}>{t('Sedan - Ô B2-047 - vào lúc 13:54:12', 'Sedan - Slot B2-047 - 13:54:12 in')}</ThemedText>
          <View style={styles.sessionStats}>
            <View style={styles.sessionStatItem}>
              <ThemedText style={styles.sessionStatLabel}>{t('Thời lượng', 'Duration')}</ThemedText>
              <ThemedText style={styles.sessionStatValue}>01:48</ThemedText>
            </View>
            <View style={styles.sessionStatItem}>
              <ThemedText style={styles.sessionStatLabel}>{t('Đơn giá', 'Rate')}</ThemedText>
              <ThemedText style={styles.sessionStatValue}>25k/h</ThemedText>
            </View>
            <View style={styles.sessionStatItem}>
              <ThemedText style={styles.sessionStatLabel}>{t('Tổng phí', 'Total')}</ThemedText>
              <ThemedText style={styles.sessionStatValuePrimary}>45k VND</ThemedText>
            </View>
          </View>
          <View style={styles.actionRow}>
            <View style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>{t('Tiền mặt', 'Cash')}</ThemedText>
            </View>
            <View style={styles.primaryButton}>
                <ThemedText style={styles.primaryButtonText}>{t('Tài xế đã thanh toán', 'Driver paid')}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.eyebrow}>{t('Tác vụ nhanh', 'Quick actions')}</ThemedText>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <View key={action} style={styles.quickItem}>
                <ThemedText style={styles.quickText}>{action}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.eyebrow}>{t('Phiên gần đây của tôi', 'My recent sessions')}</ThemedText>
          <View style={styles.sessionList}>
            {recentSessions.map(([id, plate, slot, status, duration]) => (
              <View key={id} style={styles.sessionRow}>
                <View style={styles.sessionRowLeft}>
                  <ThemedText style={styles.sessionRowId}>{id}</ThemedText>
                  <ThemedText style={styles.sessionRowPlate}>{plate}</ThemedText>
                  <ThemedText style={styles.sessionRowSlot}>to {slot}</ThemedText>
                </View>
                <View style={styles.sessionRowRight}>
                  <View
                    style={
                      status === 'IN-USE' ? styles.statusBadgeActive : styles.statusBadge
                    }
                  >
                    <ThemedText
                      style={
                        status === 'IN-USE'
                          ? styles.statusBadgeTextActive
                          : styles.statusBadgeText
                      }
                    >
                      {status}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.sessionRowDuration}>{duration}</ThemedText>
                </View>
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
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  searchIcon: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  searchValue: {
    ...Typography.mono,
    color: DesignColors.ink,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: DesignColors.primary,
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.button,
    color: DesignColors.onPrimary,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: DesignColors.surface2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...Typography.button,
    color: DesignColors.ink,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionBadge: {
    borderRadius: Radius.sm,
    backgroundColor: DesignColors.surface2,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  sessionBadgeText: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
    textTransform: 'uppercase',
  },
  sessionId: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  sessionPlate: {
    ...Typography.headline,
    color: DesignColors.ink,
  },
  sessionDetail: {
    ...Typography.bodySm,
    color: DesignColors.inkMuted,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    backgroundColor: DesignColors.surface2,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  sessionStatItem: {
    flex: 1,
    gap: 2,
  },
  sessionStatLabel: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
    textTransform: 'uppercase',
  },
  sessionStatValue: {
    ...Typography.bodySm,
    fontWeight: 600,
    color: DesignColors.ink,
  },
  sessionStatValuePrimary: {
    ...Typography.bodySm,
    fontWeight: 600,
    color: DesignColors.primary,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickItem: {
    flexBasis: '48%',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  quickText: {
    ...Typography.bodySm,
    color: DesignColors.ink,
  },
  sessionList: {
    gap: Spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    padding: Spacing.sm,
  },
  sessionRowLeft: {
    flex: 1,
    gap: 2,
  },
  sessionRowId: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  sessionRowPlate: {
    ...Typography.bodySm,
    fontWeight: 600,
    color: DesignColors.ink,
  },
  sessionRowSlot: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  sessionRowRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  statusBadge: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  statusBadgeActive: {
    borderRadius: Radius.sm,
    backgroundColor: DesignColors.surface1,
    borderWidth: 1,
    borderColor: DesignColors.primary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  statusBadgeText: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
    textTransform: 'uppercase',
  },
  statusBadgeTextActive: {
    ...Typography.caption,
    color: DesignColors.primary,
    textTransform: 'uppercase',
  },
  sessionRowDuration: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
});
