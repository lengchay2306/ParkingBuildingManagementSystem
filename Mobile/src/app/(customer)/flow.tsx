import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { MaxContentWidth } from '@/constants/theme';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

const getSteps = (t: (vi: string, en: string) => string) => [
  {
    n: '01',
    actor: t('Tài xế', 'Driver'),
    title: t('Tìm chỗ và đặt trước', 'Discover and pre-book'),
    body:
      t(
        'Tài xế mở ứng dụng, xem biểu phí và chỗ trống, có thể đặt trước khu vực và khung thời gian.',
        'Driver opens the portal, reviews tariffs and free slots, and can pre-book a zone and time window.',
      ),
    surface: t('Tài xế - Web/Mobile', 'Driver - Web/Mobile'),
    icon: 'WEB',
  },
  {
    n: '02',
    actor: t('Tài xế', 'Driver'),
    title: t('Đến cổng vào', 'Arrive at the gate'),
    body:
      t(
        'Xe tới cổng vào. Biển số được nhận diện tự động; nhân viên xử lý nếu nhận diện thất bại.',
        'Vehicle reaches entry. Plate is captured automatically; staff takes over if recognition fails.',
      ),
    surface: t('Cổng - Camera', 'Gate - Camera'),
    icon: 'GATE',
  },
  {
    n: '03',
    actor: t('Nhân viên', 'Staff'),
    title: t('Xác nhận biển số và mở phiên', 'Confirm plate and open session'),
    body: t(
      'Nhân viên xác nhận biển số, chọn loại xe và hệ thống ghi nhận thời gian vào cùng cổng.',
      'Staff confirms plate, selects vehicle type, and system records entry time and gate.',
    ),
    surface: t('Nhân viên - Tablet POS', 'Staff - Tablet POS'),
    icon: 'POS',
  },
  {
    n: '04',
    actor: t('Hệ thống', 'System'),
    title: t('Gán ô và đánh dấu đang sử dụng', 'Assign slot and mark in-use'),
    body:
      t(
        'AI chọn ô theo loại xe và chính sách. Ô chuyển từ TRỐNG sang ĐANG SỬ DỤNG, tài xế nhận mã ô.',
        'AI selects a slot by vehicle type and policy. Slot flips from EMPTY to IN-USE, driver receives slot ID.',
      ),
    surface: 'AI Router',
    icon: 'AI',
  },
  {
    n: '05',
    actor: t('Tài xế', 'Driver'),
    title: t('Đỗ xe và theo dõi phiên', 'Park and track session'),
    body: t(
      'Tài xế theo dõi thời gian, mã ô, khu vực và phí dự kiến kèm chỉ đường.',
      'Driver sees timer, slot, zone, and estimated fee with wayfinding guidance.',
    ),
    surface: t('Tài xế - Ứng dụng di động', 'Driver - Mobile App'),
    icon: 'TIME',
  },
  {
    n: '06',
    actor: t('Nhân viên', 'Staff'),
    title: t('Tìm phiên và xác nhận ra cổng', 'Find session and confirm exit'),
    body:
      t(
        'Tại cổng ra, nhân viên tra cứu bằng biển số hoặc mã phiên. Hệ thống tính thời gian và phí.',
        'At exit gate, staff searches by plate or session ID. System computes elapsed time and fee.',
      ),
    surface: t('Nhân viên - Thiết bị cầm tay', 'Staff - Handheld'),
    icon: 'EXIT',
  },
  {
    n: '07',
    actor: t('Tài xế', 'Driver'),
    title: t('Thanh toán và rời bãi', 'Pay and leave'),
    body: t(
      'Tài xế thanh toán bằng ví, thẻ, QR hoặc tiền mặt. Hóa đơn được xuất và cổng mở.',
      'Driver pays via wallet, card, QR, or cash. Receipt is issued and gate opens.',
    ),
    surface: t('Tài xế - Mobile/POS', 'Driver - Mobile/POS'),
    icon: 'PAY',
  },
  {
    n: '08',
    actor: t('Hệ thống', 'System'),
    title: t('Giải phóng ô và đóng phiên', 'Release slot and close session'),
    body: t(
      'Ô chuyển lại về TRỐNG. Phiên kết thúc. Bảng điều hành quản lý cập nhật theo thời gian thực.',
      'Slot flips back to EMPTY. Session closes. Manager dashboard updates in real time.',
    ),
    surface: t('Hệ thống', 'System'),
    icon: 'DONE',
  },
];

const getSlotStates = (DesignColors: DesignColorPalette, t: (vi: string, en: string) => string) => [
  ['EMPTY', DesignColors.semanticSuccess, t('Trống, có thể được AI gán', 'Free, biddable by AI router')],
  ['RESERVED', DesignColors.inkSubtle, t('Giữ chỗ theo lịch đặt trước', 'Held by pre-booking until grace expires')],
  ['IN-USE', DesignColors.primary, t('Phiên đang hoạt động, phí tăng theo thời gian', 'Active session, fee accruing')],
  ['MAINTENANCE', DesignColors.inkSubtle, t('Tạm dừng do vệ sinh hoặc phần cứng', 'Hardware or cleaning hold')],
  ['LOCKED', DesignColors.inkSubtle, t('Bị khóa thủ công bởi quản lý', 'Manually blocked by manager')],
] as const;

const getExceptions = (t: (vi: string, en: string) => string) => [
  [t('Mất vé/thẻ', 'Lost ticket/card'), t('Nhân viên xác minh biển số, khôi phục phiên và áp phụ phí', 'Staff verifies plate, recovers session, applies surcharge')],
  [t('Lệch biển số', 'Plate mismatch'), t('Nhân viên override biển số phiên; hệ thống lưu nhật ký', 'Staff overrides plate on session; audit log recorded')],
  [t('Quá giờ gửi', 'Over-stay'), t('Biểu phí tăng theo chính sách; gửi cảnh báo cho quản lý', 'Tariff escalates per policy; alert pushed to manager')],
  [t('Đỗ sai khu vực', 'Wrong-zone parking'), t('Tài xế nhận thông báo; nhân viên có thể gán lại ô', 'Driver receives push; staff can reassign slot')],
  [t('Ra cổng chưa thanh toán', 'Unpaid exit'), t('Giữ cổng, gửi link thanh toán cho tài xế, đưa vào hàng chờ', 'Gate held; payment link sent to driver; ticket queued')],
];

export default function FlowScreen() {
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const steps = useMemo(() => getSteps(t), [t]);
  const slotStates = useMemo(() => getSlotStates(DesignColors, t), [DesignColors, t]);
  const exceptions = useMemo(() => getExceptions(t), [t]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>{t('Tham chiếu - End-to-end', 'Reference - End-to-end')}</ThemedText>
          <ThemedText style={styles.title}>{t('Luồng phiên gửi xe chính', 'Main parking session flow')}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {t(
              'Tám bước qua bốn vai trò, từ lúc vào cổng đến khi giải phóng ô.',
              'Eight steps across four actors, from gate arrival to slot release.',
            )}
          </ThemedText>
        </View>

        <View style={styles.actorRow}>
          {[t('Tài xế', 'Driver'), t('Nhân viên', 'Staff'), t('Hệ thống', 'System'), t('Quản lý', 'Manager')].map((actor, index) => (
            <View key={actor} style={styles.actorChip}>
              <ThemedText style={styles.actorNumber}>0{index + 1}</ThemedText>
              <ThemedText style={styles.actorLabel}>{actor}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.stepsList}>
          {steps.map((step, index) => (
            <View key={step.n} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepIcon}>
                  <ThemedText style={styles.stepIconText}>{step.icon}</ThemedText>
                </View>
                <ThemedText style={styles.stepNumber}>{step.n}</ThemedText>
              </View>
              <View style={styles.stepBody}>
                <View style={styles.stepMetaRow}>
                  <View style={styles.stepActorTag}>
                    <ThemedText style={styles.stepActorText}>{step.actor}</ThemedText>
                  </View>
                  <ThemedText style={styles.stepTitle}>{step.title}</ThemedText>
                </View>
                <ThemedText style={styles.stepDescription}>{step.body}</ThemedText>
                <View style={styles.stepSurfaceTag}>
                  <ThemedText style={styles.stepSurfaceText}>{step.surface}</ThemedText>
                </View>
              </View>
              {index < steps.length - 1 ? <View style={styles.stepDivider} /> : null}
            </View>
          ))}
        </View>

        <View style={styles.gridSection}>
          <View style={styles.card}>
            <ThemedText style={styles.eyebrow}>{t('Vòng đời trạng thái ô', 'Slot state machine')}</ThemedText>
            <ThemedText style={styles.sectionTitle}>{t('5 trạng thái, một nguồn dữ liệu chuẩn', '5 states, one source of truth')}</ThemedText>
            <View style={styles.stateList}>
              {slotStates.map(([label, color, detail]) => (
                <View key={label} style={styles.stateRow}>
                  <View style={[styles.stateDot, { backgroundColor: color }]} />
                  <View style={styles.stateText}>
                    <ThemedText style={styles.stateLabel}>{label}</ThemedText>
                    <ThemedText style={styles.stateDetail}>{detail}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.eyebrow}>{t('Xử lý ngoại lệ', 'Exception handling')}</ThemedText>
            <ThemedText style={styles.sectionTitle}>{t('Các tình huống biên nhân viên xử lý', 'Edge cases staff resolve')}</ThemedText>
            <View style={styles.exceptionList}>
              {exceptions.map(([title, detail]) => (
                <View key={title} style={styles.exceptionRow}>
                  <ThemedText style={styles.exceptionTitle}>{title}</ThemedText>
                  <ThemedText style={styles.exceptionDetail}>{detail}</ThemedText>
                </View>
              ))}
            </View>
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
  actorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: DesignColors.surface1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  actorNumber: {
    ...Typography.mono,
    color: DesignColors.ink,
  },
  actorLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    color: DesignColors.inkSubtle,
  },
  stepsList: {
    gap: Spacing.sm,
  },
  stepCard: {
    backgroundColor: DesignColors.surface1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DesignColors.surface2,
  },
  stepIconText: {
    ...Typography.caption,
    color: DesignColors.ink,
  },
  stepNumber: {
    ...Typography.headline,
    color: DesignColors.inkSubtle,
  },
  stepBody: {
    gap: Spacing.xs,
  },
  stepMetaRow: {
    gap: Spacing.xs,
  },
  stepActorTag: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    backgroundColor: DesignColors.surface2,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  stepActorText: {
    ...Typography.caption,
    textTransform: 'uppercase',
    color: DesignColors.primary,
  },
  stepTitle: {
    ...Typography.cardTitle,
    color: DesignColors.ink,
  },
  stepDescription: {
    ...Typography.bodySm,
    color: DesignColors.inkMuted,
  },
  stepSurfaceTag: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  stepSurfaceText: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
    textTransform: 'uppercase',
  },
  stepDivider: {
    height: 1,
    backgroundColor: DesignColors.hairline,
    marginTop: Spacing.sm,
  },
  gridSection: {
    gap: Spacing.sm,
  },
  card: {
    backgroundColor: DesignColors.surface1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.cardTitle,
    color: DesignColors.ink,
  },
  stateList: {
    gap: Spacing.sm,
  },
  stateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: DesignColors.surface2,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    marginTop: 4,
  },
  stateText: {
    flex: 1,
    gap: 2,
  },
  stateLabel: {
    ...Typography.bodySm,
    fontWeight: 600,
    color: DesignColors.ink,
  },
  stateDetail: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  exceptionList: {
    gap: Spacing.sm,
  },
  exceptionRow: {
    borderBottomWidth: 1,
    borderBottomColor: DesignColors.hairline,
    paddingBottom: Spacing.sm,
    gap: 2,
  },
  exceptionTitle: {
    ...Typography.bodySm,
    fontWeight: 600,
    color: DesignColors.ink,
  },
  exceptionDetail: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
});
