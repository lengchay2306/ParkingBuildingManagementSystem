import React, { useMemo } from 'react';
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

type StaffPaymentQrModalProps = {
  visible: boolean;
  bill: StaffBillQrResult | null;
  plate?: string;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  t: (vi: string, en: string) => string;
};

export function StaffPaymentQrModal({
  visible,
  bill,
  plate,
  isConfirming = false,
  onClose,
  onConfirm,
  t,
}: StaffPaymentQrModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const qrUri = bill ? vietQrImageUri(bill.qrCode, 220) : null;
  const sheetMaxHeight = Math.min(windowHeight * 0.88, 640);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              maxHeight: sheetMaxHeight,
              paddingBottom: Math.max(insets.bottom, Spacing.md),
            },
          ]}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{t('Thanh toán VietQR', 'VietQR payment')}</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText style={styles.close}>{t('Đóng', 'Close')}</ThemedText>
            </Pressable>
          </View>

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
              <View style={styles.loadingBox}>
                <ActivityIndicator color={DesignColors.primary} />
              </View>
            ) : (
              <>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <ThemedText style={styles.metaLabel}>{t('Số tiền', 'Amount')}</ThemedText>
                    <ThemedText style={styles.metaValue}>{formatVnd(bill.amount)}</ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <ThemedText style={styles.metaLabel}>{t('Thời gian', 'Duration')}</ThemedText>
                    <ThemedText style={styles.metaValue}>
                      {Number.isFinite(bill.totalHours) ? `${bill.totalHours.toFixed(1)} h` : '—'}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.orderCode}>
                  {t('Mã đơn', 'Order')}: {bill.orderCode}
                </ThemedText>

                <View style={styles.qrWrap}>
                  {qrUri ? (
                    <Image source={{ uri: qrUri }} style={styles.qrImage} resizeMode="contain" />
                  ) : null}
                </View>

                <StaffActionButton
                  disabled={isConfirming}
                  loading={isConfirming}
                  label={t('Đã thanh toán — xác nhận ra cổng', 'Paid — confirm exit')}
                  onPress={onConfirm}
                />
              </>
            )}
          </ScrollView>
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
      // Hug content — do not stretch to full screen height
      flexGrow: 0,
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      gap: Spacing.sm,
      paddingBottom: Spacing.xs,
      flexGrow: 0,
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
    subtitle: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    loadingBox: {
      height: 160,
      alignItems: 'center',
      justifyContent: 'center',
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
    orderCode: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontFamily: 'monospace',
    },
    qrWrap: {
      alignSelf: 'center',
      backgroundColor: '#ffffff',
      borderRadius: Radius.md,
      padding: Spacing.sm,
      marginVertical: Spacing.xs,
    },
    qrImage: {
      width: 200,
      height: 200,
    },
  });
}
