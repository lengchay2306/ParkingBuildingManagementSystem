import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { StaffDarkCard } from '@/features/staff/components/premium';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { StaffTextInput } from '@/features/staff/components/staff-text-input';
import { deleteManagedReservation, getActiveSessionByPlate } from '@/features/staff/api';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { formatLicensePlateForApi } from '@/features/staff/lib/license-plate-ocr';
import {
  staffPhoneErrorMessage,
  validateObjectIdInput,
  validateStaffPhoneInput,
} from '@/features/staff/lib/session-validation';
import { useStaffScreenTitles } from '@/features/staff/lib/staff-screen-titles';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useThemePreference } from '@/hooks/theme-preference';
import { staffSessionDetailPath } from '@/roles';

export default function StaffOperationsScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const titles = useStaffScreenTitles();
  const DesignColors = useStaffDesignColors();
  const { resolvedScheme } = useThemePreference();
  const isDark = resolvedScheme === 'dark';
  const styles = useMemo(() => createStyles(DesignColors, isDark), [DesignColors, isDark]);
  const { checkoutSession, loadParkingSessions } = useStaffWorkspace();

  const [checkoutPlate, setCheckoutPlate] = useState('');
  const [isLookingUpPlate, setIsLookingUpPlate] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isDeletingReservation, setIsDeletingReservation] = useState(false);

  async function handlePlateCheckoutLookup() {
    const plate = formatLicensePlateForApi(checkoutPlate);
    if (!plate) {
      showToast(
        t('Biển số phải đúng định dạng 51A-123.44', 'License plate must match format 51A-123.44'),
        'error',
      );
      return;
    }

    setIsLookingUpPlate(true);
    try {
      const session = await getActiveSessionByPlate(plate);
      if (!session) {
        showToast(t('Không có xe ACTIVE với biển này', 'No active session for this plate'), 'error');
        return;
      }
      await loadParkingSessions({ status: 'ACTIVE' }).catch(() => undefined);
      router.push(staffSessionDetailPath(session._id) as never);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Tra cứu thất bại', 'Lookup failed'),
        'error',
      );
    } finally {
      setIsLookingUpPlate(false);
    }
  }

  async function handleMonthlyCheckout(paymentLabel: string) {
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

  return (
    <StaffPageShell title={titles.checkout}>
      <StaffDarkCard accentBorder="primary" index={0} style={styles.cardPrimary}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, styles.iconBadgePrimary]}>
            <Ionicons color={DesignColors.primaryFocus} name="car-sport-outline" size={20} />
          </View>
          <ThemedText style={styles.cardTitle}>{t('Theo biển số', 'By plate')}</ThemedText>
        </View>

        <ThemedText style={styles.fieldLabel}>{t('Biển số xe', 'License plate')}</ThemedText>
        <StaffTextInput
          autoCapitalize="characters"
          editable={!isLookingUpPlate}
          onChangeText={setCheckoutPlate}
          placeholder="51A-123.44"
          style={styles.input}
          value={checkoutPlate}
        />
        <StaffActionButton
          disabled={isLookingUpPlate}
          label={t('Tra cứu & checkout', 'Lookup & checkout')}
          loading={isLookingUpPlate}
          onPress={() => void handlePlateCheckoutLookup()}
          style={styles.fullWidthButton}
        />
      </StaffDarkCard>

      <StaffDarkCard accentBorder="success" index={1} style={styles.cardMonthly}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, styles.iconBadgeMonthly]}>
            <Ionicons color={DesignColors.accentEmerald} name="card-outline" size={20} />
          </View>
          <ThemedText style={styles.cardTitle}>{t('Thẻ tháng', 'Monthly card')}</ThemedText>
        </View>

        <ThemedText style={styles.fieldLabel}>{t('Mã phiên', 'Session ID')}</ThemedText>
        <StaffTextInput
          editable={!isCheckingOut}
          mono
          onChangeText={setSessionId}
          placeholder={t('ObjectId phiên ACTIVE', 'ACTIVE session ObjectId')}
          style={styles.input}
          value={sessionId}
        />
        <ThemedText style={styles.fieldLabel}>{t('Số điện thoại', 'Phone')}</ThemedText>
        <StaffTextInput
          editable={!isCheckingOut}
          keyboardType="phone-pad"
          onChangeText={(text) => setCheckoutPhone(text.replace(/\D/g, '').slice(0, 10))}
          placeholder={t('10 chữ số', '10 digits')}
          style={styles.input}
          value={checkoutPhone}
        />
        <StaffActionButton
          disabled={isCheckingOut}
          label={t('Xác nhận ra cổng', 'Confirm exit')}
          loading={isCheckingOut}
          onPress={() => void handleMonthlyCheckout(t('Thẻ tháng', 'Monthly card'))}
          style={styles.fullWidthButton}
        />
      </StaffDarkCard>

      <StaffDarkCard accentBorder="warning" index={2} style={styles.cardDanger}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, styles.iconBadgeDanger]}>
            <Ionicons color={DesignColors.accentAmber} name="trash-outline" size={20} />
          </View>
          <ThemedText style={styles.cardTitle}>{t('Xóa đặt chỗ', 'Delete reservation')}</ThemedText>
        </View>

        <ThemedText style={styles.fieldLabel}>{t('Mã đặt chỗ', 'Reservation ID')}</ThemedText>
        <StaffTextInput
          editable={!isDeletingReservation}
          mono
          onChangeText={setReservationId}
          placeholder={t('ObjectId PENDING', 'PENDING ObjectId')}
          style={styles.input}
          value={reservationId}
        />
        <StaffActionButton
          disabled={isDeletingReservation}
          label={t('Xóa đặt chỗ PENDING', 'Delete PENDING reservation')}
          loading={isDeletingReservation}
          onPress={() => void handleDeleteReservation()}
          style={styles.fullWidthButton}
          variant="danger"
        />
      </StaffDarkCard>
    </StaffPageShell>
  );
}

function createStyles(
  DesignColors: ReturnType<typeof useStaffDesignColors>,
  isDark: boolean,
) {
  const elevatedCard = {
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : DesignColors.hairlineStrong,
    backgroundColor: isDark ? DesignColors.surface2 : DesignColors.surface1,
    shadowColor: isDark ? '#000' : DesignColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.35 : 0.1,
    shadowRadius: 16,
    elevation: 5,
    gap: Spacing.md,
    padding: Spacing.lg,
  } as const;

  return StyleSheet.create({
    cardPrimary: {
      ...elevatedCard,
      backgroundColor: isDark ? 'rgba(79,70,229,0.14)' : 'rgba(94,106,210,0.08)',
      borderColor: isDark ? 'rgba(129,140,248,0.35)' : 'rgba(94,106,210,0.28)',
    },
    cardMonthly: {
      ...elevatedCard,
      backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(5,150,105,0.07)',
      borderColor: isDark ? 'rgba(52,211,153,0.32)' : 'rgba(5,150,105,0.25)',
    },
    cardDanger: {
      ...elevatedCard,
      backgroundColor: isDark ? 'rgba(251,146,60,0.12)' : 'rgba(217,119,6,0.07)',
      borderColor: isDark ? 'rgba(251,146,60,0.35)' : 'rgba(217,119,6,0.28)',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: 2,
    },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    iconBadgePrimary: {
      backgroundColor: isDark ? 'rgba(99,102,241,0.22)' : 'rgba(94,106,210,0.14)',
      borderColor: isDark ? 'rgba(129,140,248,0.4)' : 'rgba(94,106,210,0.3)',
    },
    iconBadgeMonthly: {
      backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(5,150,105,0.12)',
      borderColor: isDark ? 'rgba(52,211,153,0.4)' : 'rgba(5,150,105,0.28)',
    },
    iconBadgeDanger: {
      backgroundColor: isDark ? 'rgba(251,146,60,0.2)' : 'rgba(217,119,6,0.12)',
      borderColor: isDark ? 'rgba(251,146,60,0.4)' : 'rgba(217,119,6,0.28)',
    },
    cardTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 17,
      flex: 1,
    },
    fieldLabel: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontWeight: '600',
      fontSize: 12,
      letterSpacing: 0.2,
      marginBottom: -4,
    },
    input: {
      backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : DesignColors.surface3,
      borderColor: isDark ? 'rgba(255,255,255,0.14)' : DesignColors.hairlineStrong,
    },
    fullWidthButton: {
      width: '100%',
      marginTop: 2,
    },
  });
}
