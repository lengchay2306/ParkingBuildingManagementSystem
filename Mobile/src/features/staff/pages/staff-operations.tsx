import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { StaffTextInput } from '@/features/staff/components/staff-text-input';
import { deleteManagedReservation } from '@/features/staff/api';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import {
  staffPhoneErrorMessage,
  validateObjectIdInput,
  validateStaffPhoneInput,
} from '@/features/staff/lib/session-validation';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

export default function StaffOperationsScreen() {
  useStaffRoleGuard();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const { checkoutSession } = useStaffWorkspace();

  const [sessionId, setSessionId] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isDeletingReservation, setIsDeletingReservation] = useState(false);

  async function handleCheckout(paymentLabel: string) {
    const idResult = validateObjectIdInput(sessionId, t);
    if (!idResult.ok) {
      showToast(idResult.message, 'error');
      return;
    }
    const phoneResult = validateStaffPhoneInput(checkoutPhone, t);
    if (!phoneResult.ok) {
      showToast(staffPhoneErrorMessage(phoneResult.messageKey, t), 'error');
      return;
    }

    setIsCheckingOut(true);
    try {
      await checkoutSession(idResult.id, phoneResult.phone);
      setSessionId('');
      setCheckoutPhone('');
      showToast(
        t(`${paymentLabel}: checkout thành công`, `${paymentLabel}: checkout successful`),
        'success',
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Checkout thất bại', 'Checkout failed'),
        'error',
      );
    } finally {
      setIsCheckingOut(false);
    }
  }

  async function handleDeleteReservation() {
    const idResult = validateObjectIdInput(reservationId, t);
    if (!idResult.ok) {
      showToast(idResult.message, 'error');
      return;
    }

    setIsDeletingReservation(true);
    try {
      await deleteManagedReservation(idResult.id);
      setReservationId('');
      showToast(t('Đã xóa đặt chỗ PENDING', 'PENDING reservation deleted'), 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Không xóa được đặt chỗ', 'Cannot delete reservation'),
        'error',
      );
    } finally {
      setIsDeletingReservation(false);
    }
  }

  function handleUnavailableAction(label: string) {
    showToast(
      t(
        `${label}: tính năng đang được phát triển.`,
        `${label}: feature is under development.`,
      ),
      'error',
    );
  }

  return (
    <StaffPageShell
      eyebrow={t('Tác vụ', 'Operations')}
      title={t('Ra cổng & ngoại lệ', 'Exit & exceptions')}
      subtitle={t(
        'Checkout phiên qua API backend và xử lý ngoại lệ thường gặp.',
        'Session checkout via backend API and common exception handling.',
      )}>
      <View style={styles.card}>
        <ThemedText style={styles.eyebrow}>{t('Ra cổng / Thanh toán', 'Exit / Payment')}</ThemedText>
        <ThemedText style={styles.hint}>
          {t(
            'Nhập mã phiên và SĐT khách (trùng lúc check-in). Checkout gọi API backend.',
            'Enter session ID and customer phone (same as check-in). Checkout uses the backend API.',
          )}
        </ThemedText>
        <StaffTextInput
          editable={!isCheckingOut}
          mono
          onChangeText={setSessionId}
          placeholder={t('Mã phiên (ObjectId)', 'Session ID (ObjectId)')}
          value={sessionId}
        />
        <StaffTextInput
          editable={!isCheckingOut}
          keyboardType="phone-pad"
          onChangeText={(text) => setCheckoutPhone(text.replace(/\D/g, '').slice(0, 10))}
          placeholder={t('SĐT khách (10 số)', 'Customer phone (10 digits)')}
          value={checkoutPhone}
        />
        <View style={styles.actionRow}>
          <View style={styles.actionRowItem}>
            <StaffActionButton
              disabled={isCheckingOut}
              label={t('Tiền mặt', 'Cash')}
              loading={isCheckingOut}
              onPress={() => void handleCheckout(t('Tiền mặt', 'Cash'))}
              variant="secondary"
            />
          </View>
          <View style={styles.actionRowItem}>
            <StaffActionButton
              disabled={isCheckingOut}
              label={t('Đã thanh toán', 'Paid')}
              loading={isCheckingOut}
              onPress={() => void handleCheckout(t('Khách đã thanh toán', 'Customer paid'))}
            />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.eyebrow}>{t('Xóa đặt chỗ PENDING', 'Delete PENDING reservation')}</ThemedText>
        <StaffTextInput
          editable={!isDeletingReservation}
          mono
          onChangeText={setReservationId}
          placeholder={t('Mã đặt chỗ (ObjectId)', 'Reservation ID (ObjectId)')}
          value={reservationId}
        />
        <StaffActionButton
          disabled={isDeletingReservation}
          label={t('Xóa đặt chỗ', 'Delete reservation')}
          loading={isDeletingReservation}
          onPress={() => void handleDeleteReservation()}
          style={styles.fullWidthButton}
          variant="danger"
        />
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.eyebrow}>{t('Tác vụ nhanh', 'Quick actions')}</ThemedText>
        <ThemedText style={styles.hint}>
          {t(
            'Các tác vụ dưới đây chưa có API backend — sẽ bổ sung sau.',
            'The actions below have no backend API yet — coming later.',
          )}
        </ThemedText>
        <View style={styles.quickGrid}>
          {[t('Mất thẻ', 'Lost card'), t('Sửa biển số', 'Plate fix'), t('Sai khu vực', 'Wrong zone')].map(
            (action) => (
              <StaffActionButton
                compact
                key={action}
                label={action}
                onPress={() => handleUnavailableAction(action)}
                variant="ghost"
              />
            ),
          )}
        </View>
      </View>
    </StaffPageShell>
  );
}
