import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { StaffTextInput } from '@/features/staff/components/staff-text-input';
import { deleteManagedReservation } from '@/features/staff/api';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

export default function StaffOperationsScreen() {
  useStaffRoleGuard();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);

  const [reservationId, setReservationId] = useState('');
  const [isDeletingReservation, setIsDeletingReservation] = useState(false);

  function handleUnavailableAction(label: string) {
    showToast(
      t(
        `${label}: API backend chưa có.`,
        `${label}: backend API not available yet.`,
      ),
    );
  }

  async function handleDeleteReservation() {
    const id = reservationId.trim();
    if (!id) {
      showToast(t('Nhập mã đặt chỗ', 'Enter a reservation ID'), 'error');
      return;
    }

    setIsDeletingReservation(true);
    try {
      await deleteManagedReservation(id);
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

  return (
    <StaffPageShell
      eyebrow={t('Tác vụ', 'Operations')}
      title={t('Ra cổng & ngoại lệ', 'Exit & exceptions')}
      subtitle={t(
        'Các thao tác tuần tra ngoài check-in thường ngày.',
        'Patrol tasks beyond regular check-in.',
      )}>
      <View style={styles.card}>
        <ThemedText style={styles.eyebrow}>{t('Ra cổng / Thanh toán', 'Exit / Payment')}</ThemedText>
        <ThemedText style={styles.hint}>
          {t(
            'Backend chưa có API tra phiên, checkout hay thanh toán.',
            'Backend has no session lookup, checkout, or payment APIs yet.',
          )}
        </ThemedText>
        <View style={styles.actionRow}>
          <View style={styles.actionRowItem}>
            <StaffActionButton
              label={t('Tiền mặt', 'Cash')}
              onPress={() => handleUnavailableAction(t('Tiền mặt', 'Cash'))}
              variant="secondary"
            />
          </View>
          <View style={styles.actionRowItem}>
            <StaffActionButton
              label={t('Tài xế đã thanh toán', 'Driver paid')}
              onPress={() => handleUnavailableAction(t('Tài xế đã thanh toán', 'Driver paid'))}
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
          onPress={handleDeleteReservation}
          variant="danger"
        />
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.eyebrow}>{t('Tác vụ nhanh', 'Quick actions')}</ThemedText>
        <View style={styles.quickGrid}>
          {[t('Mất thẻ', 'Lost card'), t('Sửa biển số', 'Plate fix'), t('Sai khu vực', 'Wrong zone')].map(
            (action) => (
              <Pressable
                key={action}
                onPress={() => handleUnavailableAction(action)}
                style={({ pressed }) => [styles.quickItem, pressed && styles.buttonPressed]}>
                <ThemedText style={styles.quickText}>{action}</ThemedText>
              </Pressable>
            ),
          )}
        </View>
      </View>
    </StaffPageShell>
  );
}
