import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppToast } from '@/components/app-toast';
import { DriverAppBar } from '@/components/driver/driver-app-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

type PaymentMethod = 'sandbox' | 'cash';

const FEE_ROWS = [
  { key: 'base', labelVi: 'Phí cơ bản', labelEn: 'Base fee', value: '30.000đ' },
  { key: 'time', labelVi: 'Thời gian gửi', labelEn: 'Parking time', value: '15.000đ' },
  { key: 'maint', labelVi: 'Phụ phí (Bảo trì)', labelEn: 'Maintenance surcharge', value: '5.000đ' },
];

const PAYMENT_METHODS: {
  key: PaymentMethod;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: 'sandbox',
    titleVi: 'Sandbox',
    titleEn: 'Sandbox',
    descVi: 'Cổng thử nghiệm',
    descEn: 'Test gateway',
    icon: 'card-outline',
  },
  {
    key: 'cash',
    titleVi: 'Tiền mặt tại quầy',
    titleEn: 'Cash at counter',
    descVi: 'Thanh toán trực tiếp',
    descEn: 'Pay in person',
    icon: 'cash-outline',
  },
];

/** thanh_to_n_premium_discount_added — checkout / payment */
export default function DriverPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const [method, setMethod] = useState<PaymentMethod>('sandbox');
  const [submitting, setSubmitting] = useState(false);

  const handlePay = async () => {
    setSubmitting(true);
    try {
      // TODO: POST payment when backend endpoint is available.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      showToast(
        t(
          `Thanh toán ${method === 'sandbox' ? 'Sandbox' : 'tiền mặt'} thành công!`,
          `Payment via ${method} successful!`,
        ),
        'success',
      );
      router.replace('/driver/session' as never);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Thanh toán thất bại.', 'Payment failed.'),
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <DriverAppBar showBack onBack={() => router.back()} title={t('Thanh toán', 'Payment')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.amountSection}>
          <ThemedText style={styles.amountLabel}>{t('Tổng thanh toán', 'Total amount')}</ThemedText>
          <ThemedText style={styles.amountValue}>
            45.000<ThemedText style={styles.amountCurrency}>đ</ThemedText>
          </ThemedText>
          <View style={styles.premiumBadge}>
            <View style={styles.premiumDot} />
            <ThemedText style={styles.premiumText}>{t('Đã áp dụng Premium', 'Premium Applied')}</ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>{t('Chi tiết hóa đơn', 'Invoice details')}</ThemedText>
          <View style={styles.invoiceCard}>
            {FEE_ROWS.map((row) => (
              <View key={row.key} style={styles.invoiceRow}>
                <ThemedText style={styles.invoiceLabel}>{t(row.labelVi, row.labelEn)}</ThemedText>
                <ThemedText style={styles.invoiceValue}>{row.value}</ThemedText>
              </View>
            ))}
            <View style={styles.discountRow}>
              <View style={styles.discountLeft}>
                <ThemedText style={styles.discountLabel}>
                  {t('Hội viên Premium (-5%)', 'Premium Member (-5%)')}
                </ThemedText>
                <Ionicons color={DesignColors.primary} name="star" size={14} />
              </View>
              <ThemedText style={styles.discountValue}>-5.000đ</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            {t('Phương thức thanh toán', 'Payment method')}
          </ThemedText>
          <View style={styles.methodList}>
            {PAYMENT_METHODS.map((item) => {
              const selected = method === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setMethod(item.key)}
                  style={({ pressed }) => [
                    styles.methodCard,
                    selected && styles.methodCardSelected,
                    pressed && styles.methodPressed,
                  ]}
                >
                  <View style={[styles.methodIcon, selected && styles.methodIconSelected]}>
                    <Ionicons
                      color={selected ? DesignColors.primary : DesignColors.inkSubtle}
                      name={item.icon}
                      size={22}
                    />
                  </View>
                  <View style={styles.methodText}>
                    <ThemedText style={styles.methodTitle}>{t(item.titleVi, item.titleEn)}</ThemedText>
                    <ThemedText style={styles.methodDesc}>{t(item.descVi, item.descEn)}</ThemedText>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <Pressable
          disabled={submitting}
          onPress={handlePay}
          style={({ pressed }) => [
            styles.payButton,
            submitting && styles.payDisabled,
            pressed && !submitting && styles.payPressed,
          ]}
        >
          {submitting ? (
            <View style={styles.payLoading}>
              <ActivityIndicator color={DesignColors.onPrimary} size="small" />
              <ThemedText style={styles.payButtonText}>{t('Đang xử lý...', 'Processing...')}</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.payButtonText}>{t('Xác nhận thanh toán', 'Confirm payment')}</ThemedText>
          )}
        </Pressable>
        <ThemedText style={styles.secureText}>Kinetic Precision Secure Payment</ThemedText>
      </View>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: DesignColors.canvas },
    content: { padding: Spacing.md, gap: Spacing.lg },
    amountSection: { alignItems: 'center', paddingVertical: Spacing.xl },
    amountLabel: {
      ...Typography.caption,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: DesignColors.inkSubtle,
      marginBottom: 4,
    },
    amountValue: { fontSize: 36, fontWeight: '700', color: DesignColors.ink, letterSpacing: -1 },
    amountCurrency: { fontSize: 20, fontWeight: '400', opacity: 0.7 },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: Spacing.sm,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: `${DesignColors.primary}33`,
      backgroundColor: `${DesignColors.primary}1A`,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    premiumDot: { width: 6, height: 6, borderRadius: Radius.pill, backgroundColor: DesignColors.primary },
    premiumText: {
      ...Typography.caption,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: DesignColors.primary,
    },
    section: { gap: Spacing.sm },
    sectionLabel: {
      ...Typography.caption,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: DesignColors.inkSubtle,
      marginLeft: 4,
    },
    invoiceCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    invoiceLabel: { ...Typography.bodySm, color: DesignColors.inkSubtle },
    invoiceValue: { ...Typography.bodySm, fontWeight: '500', color: DesignColors.ink },
    discountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
      paddingTop: Spacing.sm,
      marginTop: Spacing.xxs,
    },
    discountLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    discountLabel: { ...Typography.bodySm, fontWeight: '500', color: DesignColors.primary },
    discountValue: { ...Typography.bodySm, fontWeight: '700', color: DesignColors.primary },
    methodList: { gap: Spacing.xs },
    methodCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
    },
    methodCardSelected: { borderColor: `${DesignColors.primary}66` },
    methodPressed: { opacity: 0.92 },
    methodIcon: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      backgroundColor: DesignColors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    methodIconSelected: { backgroundColor: `${DesignColors.primary}33` },
    methodText: { flex: 1 },
    methodTitle: { ...Typography.body, fontWeight: '500', color: DesignColors.ink },
    methodDesc: { ...Typography.caption, color: DesignColors.inkSubtle },
    radio: {
      width: 20,
      height: 20,
      borderRadius: Radius.pill,
      borderWidth: 2,
      borderColor: DesignColors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: { borderColor: DesignColors.primary, backgroundColor: DesignColors.primary },
    radioInner: { width: 8, height: 8, borderRadius: Radius.pill, backgroundColor: DesignColors.onPrimary },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
      backgroundColor: DesignColors.canvas,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
    },
    payButton: {
      backgroundColor: DesignColors.primary,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      shadowColor: DesignColors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    payDisabled: { opacity: 0.7 },
    payPressed: { opacity: 0.92 },
    payLoading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    payButtonText: { ...Typography.button, fontWeight: '700', color: DesignColors.onPrimary },
    secureText: {
      ...Typography.caption,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 2,
      textAlign: 'center',
      color: DesignColors.inkTertiary,
      marginTop: Spacing.sm,
    },
  });
