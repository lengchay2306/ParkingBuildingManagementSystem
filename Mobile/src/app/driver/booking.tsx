import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { DriverAppBar } from '@/components/driver/driver-app-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

type BookingStep = 1 | 2 | 3;

const SLOTS = [
  { id: 'A1', status: 'free' as const },
  { id: 'A2', status: 'occupied' as const },
  { id: 'A3', status: 'free' as const },
  { id: 'A4', status: 'free' as const },
  { id: 'A5', status: 'selected' as const },
  { id: 'A6', status: 'occupied' as const },
];

/** parkos_unified_app_final_fixed — BOOKING TAB (SCREEN_100 & SCREEN_152) */
export default function DriverBookingScreen() {
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [step, setStep] = useState<BookingStep>(1);
  const [plate, setPlate] = useState('30A-123.45');

  const progress = ((step - 1) / 2) * 100;
  const steps = [
    { n: 1, label: t('Thông tin', 'Details') },
    { n: 2, label: t('Vị trí', 'Spot') },
    { n: 3, label: t('Thanh toán', 'Payment') },
  ];

  return (
    <ThemedView style={styles.container}>
      <DriverAppBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stepper}>
          <View style={styles.stepTrack} />
          <View style={[styles.stepProgress, { width: `${progress}%` }]} />
          {steps.map(({ n, label }) => {
            const active = n <= step;
            return (
              <View key={n} style={styles.stepNode}>
                <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
                  <ThemedText style={[styles.stepNumber, active && styles.stepNumberActive]}>{n}</ThemedText>
                </View>
                <ThemedText style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</ThemedText>
              </View>
            );
          })}
        </View>

        {step === 1 && (
          <View style={styles.panel}>
            <ThemedText style={styles.panelTitle}>{t('Chi tiết đặt chỗ', 'Booking Details')}</ThemedText>
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>{t('Biển số xe', 'License plate')}</ThemedText>
              <TextInput
                style={styles.input}
                value={plate}
                onChangeText={setPlate}
                placeholderTextColor={DesignColors.inkSubtle}
              />
            </View>
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>{t('Thời gian bắt đầu', 'Start time')}</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="2026-05-31T14:30"
                placeholderTextColor={DesignColors.inkSubtle}
              />
            </View>
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>{t('Thời gian dự kiến', 'Expected duration')}</ThemedText>
              <View style={styles.select}>
                <ThemedText style={styles.selectText}>{t('4 giờ', '4 hours')}</ThemedText>
                <Ionicons color={DesignColors.inkSubtle} name="chevron-down" size={18} />
              </View>
            </View>
            <Pressable
              onPress={() => setStep(2)}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <ThemedText style={styles.primaryButtonText}>{t('Tiếp theo', 'Next')}</ThemedText>
              <Ionicons color={DesignColors.onPrimary} name="arrow-forward" size={18} />
            </Pressable>
          </View>
        )}

        {step === 2 && (
          <View style={styles.panel}>
            <ThemedText style={styles.panelTitle}>{t('Chọn vị trí', 'Select spot')}</ThemedText>
            <View style={styles.mapViewport}>
              <View style={styles.slotGrid}>
                {SLOTS.map((slot) => (
                  <View
                    key={slot.id}
                    style={[
                      styles.slot,
                      slot.status === 'free' && styles.slotFree,
                      slot.status === 'occupied' && styles.slotOccupied,
                      slot.status === 'selected' && styles.slotSelected,
                    ]}
                  >
                    {slot.status === 'occupied' ? (
                      <Ionicons color={DesignColors.inkSubtle} name="car" size={14} />
                    ) : (
                      <ThemedText style={[styles.slotLabel, slot.status === 'selected' && styles.slotLabelSelected]}>
                        {slot.id}
                      </ThemedText>
                    )}
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.legend}>
              <LegendDot color={DesignColors.semanticSuccess} label={t('Trống', 'Free')} styles={styles} />
              <LegendDot color={DesignColors.primary} label={t('Đang chọn', 'Selected')} styles={styles} />
              <LegendDot color={DesignColors.inkSubtle} label={t('Đã có xe', 'Occupied')} styles={styles} />
            </View>
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => setStep(1)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              >
                <ThemedText style={styles.secondaryButtonText}>{t('Quay lại', 'Back')}</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setStep(3)}
                style={({ pressed }) => [styles.primaryButton, styles.flexButton, pressed && styles.buttonPressed]}
              >
                <ThemedText style={styles.primaryButtonText}>{t('Tiếp theo', 'Next')}</ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.panel}>
            <ThemedText style={styles.panelTitle}>{t('Thanh toán', 'Payment')}</ThemedText>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <ThemedText style={styles.summaryMeta}>Slot ID</ThemedText>
                  <ThemedText style={styles.summarySlot}>A5</ThemedText>
                </View>
                <View style={styles.alignRight}>
                  <ThemedText style={styles.summaryMeta}>{t('Thời gian', 'Duration')}</ThemedText>
                  <ThemedText style={styles.summaryValue}>{t('4 Giờ', '4 Hours')}</ThemedText>
                </View>
              </View>
              <View style={styles.summaryGrid}>
                <View>
                  <ThemedText style={styles.summaryMeta}>{t('Vào lúc', 'Entry')}</ThemedText>
                  <ThemedText style={styles.summaryValue}>{t('14:30 - Hôm nay', '14:30 - Today')}</ThemedText>
                </View>
                <View>
                  <ThemedText style={styles.summaryMeta}>{t('Phương tiện', 'Vehicle')}</ThemedText>
                  <ThemedText style={styles.summaryValue}>{t('Xe Sedan', 'Sedan')}</ThemedText>
                </View>
              </View>
            </View>
            <View style={styles.invoiceCard}>
              <ThemedText style={styles.invoiceTitle}>{t('Chi tiết hóa đơn', 'Invoice details')}</ThemedText>
              <InvoiceLine label={t('Giá gốc (4h x 25k)', 'Base (4h x 25k)')} value="100.000đ" styles={styles} />
              <InvoiceLine label={t('Phí dịch vụ & Bảo mật', 'Service & security')} value="15.000đ" styles={styles} />
              <InvoiceLine
                label={t('Khuyến mãi (Member)', 'Member discount')}
                value="-10.000đ"
                styles={styles}
                accent
              />
              <View style={styles.invoiceTotal}>
                <ThemedText style={styles.invoiceTotalLabel}>{t('Tổng cộng', 'Total')}</ThemedText>
                <ThemedText style={styles.invoiceTotalValue}>105.000đ</ThemedText>
              </View>
            </View>
            <Pressable
              onPress={() => setStep(1)}
              style={({ pressed }) => [styles.primaryButton, styles.confirmButton, pressed && styles.buttonPressed]}
            >
              <ThemedText style={styles.confirmButtonText}>
                {t('Xác nhận & Thanh toán', 'Confirm & Pay')}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function LegendDot({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText style={styles.legendText}>{label}</ThemedText>
    </View>
  );
}

function InvoiceLine({
  label,
  value,
  styles,
  accent,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  accent?: boolean;
}) {
  return (
    <View style={styles.invoiceLine}>
      <ThemedText style={[styles.invoiceLineLabel, accent && styles.successText]}>{label}</ThemedText>
      <ThemedText style={[styles.invoiceLineValue, accent && styles.successText]}>{value}</ThemedText>
    </View>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: DesignColors.canvas },
    content: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.lg },
    stepper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xs,
      marginBottom: Spacing.md,
      position: 'relative',
    },
    stepTrack: {
      position: 'absolute',
      top: 20,
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: DesignColors.surface1,
    },
    stepProgress: {
      position: 'absolute',
      top: 20,
      left: 0,
      height: 2,
      backgroundColor: DesignColors.primary,
    },
    stepNode: { alignItems: 'center', gap: Spacing.xs, zIndex: 1 },
    stepCircle: {
      width: 40,
      height: 40,
      borderRadius: Radius.pill,
      borderWidth: 4,
      borderColor: DesignColors.canvas,
      backgroundColor: DesignColors.surface1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCircleActive: { backgroundColor: DesignColors.primary },
    stepNumber: { ...Typography.button, fontWeight: '700', color: DesignColors.inkSubtle },
    stepNumberActive: { color: DesignColors.onPrimary },
    stepLabel: {
      ...Typography.caption,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: DesignColors.inkSubtle,
    },
    stepLabelActive: { color: DesignColors.primary },
    panel: { gap: Spacing.lg },
    panelTitle: { fontSize: 24, fontWeight: '700', color: DesignColors.ink },
    field: { gap: 4 },
    fieldLabel: {
      ...Typography.eyebrow,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: DesignColors.inkSubtle,
    },
    input: {
      ...Typography.mono,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      borderRadius: Radius.md,
      backgroundColor: DesignColors.surface1,
      color: DesignColors.ink,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    select: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      borderRadius: Radius.md,
      backgroundColor: DesignColors.surface1,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    selectText: { ...Typography.body, color: DesignColors.ink },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      backgroundColor: DesignColors.primary,
      borderRadius: Radius.md,
      paddingVertical: Spacing.md,
    },
    flexButton: { flex: 1 },
    confirmButton: { paddingVertical: Spacing.md + 2 },
    primaryButtonText: { ...Typography.button, fontWeight: '700', color: DesignColors.onPrimary },
    confirmButtonText: { ...Typography.body, fontWeight: '700', color: DesignColors.onPrimary },
    buttonPressed: { opacity: 0.85 },
    mapViewport: {
      height: 280,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      padding: Spacing.lg,
      justifyContent: 'center',
    },
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    slot: {
      width: '15%',
      aspectRatio: 0.75,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: DesignColors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotFree: { backgroundColor: `${DesignColors.semanticSuccess}1A` },
    slotOccupied: { backgroundColor: `${DesignColors.inkSubtle}33` },
    slotSelected: { backgroundColor: `${DesignColors.primary}4D`, borderColor: DesignColors.primary, borderWidth: 2 },
    slotLabel: { ...Typography.caption, fontWeight: '600', color: DesignColors.ink },
    slotLabelSelected: { color: DesignColors.onPrimary },
    legend: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 12, height: 12, borderRadius: Radius.pill },
    legendText: { ...Typography.caption, fontWeight: '700', textTransform: 'uppercase', color: DesignColors.ink },
    actionRow: { flexDirection: 'row', gap: Spacing.md },
    secondaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      borderRadius: Radius.md,
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    secondaryButtonText: { ...Typography.button, fontWeight: '700', color: DesignColors.ink },
    summaryCard: {
      backgroundColor: DesignColors.primary,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryMeta: {
      ...Typography.caption,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: `${DesignColors.onPrimary}CC`,
    },
    summarySlot: { fontSize: 28, fontWeight: '900', color: DesignColors.onPrimary },
    summaryValue: { ...Typography.body, fontWeight: '700', color: DesignColors.onPrimary },
    alignRight: { alignItems: 'flex-end' },
    summaryGrid: {
      flexDirection: 'row',
      gap: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: `${DesignColors.onPrimary}33`,
      paddingTop: Spacing.md,
    },
    invoiceCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    invoiceTitle: {
      ...Typography.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: DesignColors.inkSubtle,
    },
    invoiceLine: { flexDirection: 'row', justifyContent: 'space-between' },
    invoiceLineLabel: { ...Typography.bodySm, color: DesignColors.ink },
    invoiceLineValue: { ...Typography.bodySm, fontWeight: '500', color: DesignColors.ink },
    successText: { color: DesignColors.semanticSuccess, fontWeight: '700' },
    invoiceTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
      paddingTop: Spacing.sm,
      marginTop: Spacing.xs,
    },
    invoiceTotalLabel: { ...Typography.button, fontWeight: '700', color: DesignColors.ink },
    invoiceTotalValue: { fontSize: 20, fontWeight: '900', color: DesignColors.primary },
  });
