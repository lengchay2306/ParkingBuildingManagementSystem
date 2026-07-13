import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import {
  formatVnd,
  vietQrImageUri,
  type StaffBillQrResult,
} from '@/features/payment/api';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';

/** Sheet covers most of the screen so the QR is easy to scan at the gate. */
const SHEET_HEIGHT_RATIO = 0.92;

type StaffPaymentQrModalProps = {
  visible: boolean;
  bill: StaffBillQrResult | null;
  plate?: string;
  isConfirming?: boolean;
  /** Shown when staff confirms exit but payment is not detected yet. */
  unpaidNotice?: string | null;
  onDismissUnpaidNotice?: () => void;
  onClose: () => void;
  onConfirm: () => void;
  t: (vi: string, en: string) => string;
};

export function StaffPaymentQrModal({
  visible,
  bill,
  plate,
  isConfirming = false,
  unpaidNotice = null,
  onDismissUnpaidNotice,
  onClose,
  onConfirm,
  t,
}: StaffPaymentQrModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalNotice(unpaidNotice);
  }, [unpaidNotice]);

  useEffect(() => {
    if (!visible) {
      setLocalNotice(null);
    }
  }, [visible]);

  const sheetHeight = Math.round(windowHeight * SHEET_HEIGHT_RATIO);
  const qrSize = Math.min(Math.round(windowWidth * 0.72), 320);
  const qrUri = bill ? vietQrImageUri(bill.qrCode, Math.round(qrSize * 1.1)) : null;
  const notice = localNotice?.trim() || null;

  function dismissNotice() {
    setLocalNotice(null);
    onDismissUnpaidNotice?.();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, Spacing.md),
            },
          ]}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{t('Thanh toán VietQR', 'VietQR payment')}</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText style={styles.close}>{t('Đóng', 'Close')}</ThemedText>
            </Pressable>
          </View>

          {notice ? (
            <Animated.View
              entering={FadeInDown.duration(280)}
              exiting={FadeOutUp.duration(180)}
              style={styles.unpaidBanner}>
              <View style={styles.unpaidIcon}>
                <Ionicons color={DesignColors.accentAmber} name="warning" size={20} />
              </View>
              <View style={styles.unpaidCopy}>
                <ThemedText style={styles.unpaidTitle}>
                  {t('Khách chưa thanh toán', 'Customer has not paid')}
                </ThemedText>
                <ThemedText style={styles.unpaidMessage}>{notice}</ThemedText>
              </View>
              <Pressable accessibilityLabel="Dismiss" hitSlop={10} onPress={dismissNotice}>
                <Ionicons color={DesignColors.inkSubtle} name="close" size={18} />
              </Pressable>
            </Animated.View>
          ) : null}

          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scroll}>
            <ThemedText style={styles.subtitle}>
              {t('Khách quét mã để thanh toán phí gửi xe', 'Customer scans to pay parking fee')}
              {plate ? ` · ${plate}` : ''}
            </ThemedText>

            {!bill ? (
              <View style={[styles.loadingBox, { minHeight: qrSize }]}>
                <ActivityIndicator color={DesignColors.primary} />
              </View>
            ) : (
              <>
                <View style={styles.amountHero}>
                  <ThemedText style={styles.amountLabel}>
                    {t('Số tiền phải trả', 'Amount due')}
                  </ThemedText>
                  <ThemedText style={styles.amountValue}>{formatVnd(bill.amount)}</ThemedText>
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <ThemedText style={styles.metaLabel}>{t('Thời gian', 'Duration')}</ThemedText>
                    <ThemedText style={styles.metaValue}>
                      {Number.isFinite(bill.totalHours) ? `${bill.totalHours.toFixed(1)} h` : '—'}
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <ThemedText style={styles.metaLabel}>{t('Mã đơn', 'Order')}</ThemedText>
                    <ThemedText style={styles.metaValue}>{bill.orderCode}</ThemedText>
                  </View>
                </View>

                <View style={styles.qrArea}>
                  <View style={styles.qrWrap}>
                    {qrUri ? (
                      <Image
                        source={{ uri: qrUri }}
                        style={{ width: qrSize, height: qrSize }}
                        resizeMode="contain"
                      />
                    ) : null}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {bill ? (
            <View style={styles.footer}>
              <StaffActionButton
                disabled={isConfirming}
                loading={isConfirming}
                label={t('Đã thanh toán — xác nhận ra cổng', 'Paid — confirm exit')}
                onPress={onConfirm}
              />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      backgroundColor: DesignColors.surface1,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      gap: Spacing.sm,
      paddingBottom: Spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.xs,
    },
    title: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    close: {
      ...Typography.bodySm,
      color: DesignColors.primary,
      fontWeight: '600',
    },
    unpaidBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
      padding: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: 'rgba(251,146,60,0.45)',
      backgroundColor: 'rgba(251,146,60,0.14)',
    },
    unpaidIcon: {
      width: 32,
      height: 32,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(251,146,60,0.18)',
    },
    unpaidCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    unpaidTitle: {
      ...Typography.bodySm,
      color: DesignColors.accentAmber,
      fontWeight: '700',
    },
    unpaidMessage: {
      ...Typography.caption,
      color: DesignColors.ink,
      lineHeight: 18,
    },
    subtitle: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    loadingBox: {
      alignItems: 'center',
      justifyContent: 'center',
      flexGrow: 1,
    },
    amountHero: {
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface2,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      alignItems: 'center',
      gap: 4,
    },
    amountLabel: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    amountValue: {
      ...Typography.metricValue,
      color: DesignColors.primary,
      fontSize: 32,
      fontWeight: '700',
    },
    metaRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    metaItem: {
      flex: 1,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      padding: Spacing.sm,
    },
    metaLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textTransform: 'uppercase',
    },
    metaValue: {
      ...Typography.subhead,
      color: DesignColors.ink,
      marginTop: 4,
      fontWeight: '600',
    },
    qrArea: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
    },
    qrWrap: {
      backgroundColor: '#ffffff',
      borderRadius: Radius.md,
      padding: Spacing.sm,
    },
    footer: {
      paddingTop: Spacing.sm,
    },
  });
}
