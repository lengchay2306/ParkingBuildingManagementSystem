import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { StaffCheckInSlotPicker } from '@/features/staff/components/staff-check-in-slot-picker';
import type { ParkingFloor, Reservation, StaffVehicle, VehicleOwnerProfile } from '@/features/staff/api';
import { resolveVehicleTypeLabel } from '@/features/staff/api';
import {
  formatReservationSlotLabel,
  getReservationDriverName,
} from '@/features/staff/lib/reservation-helpers';
import { useDesignColors } from '@/hooks/use-design-colors';

type StaffCheckInConfirmStepProps = {
  vehicle: StaffVehicle;
  ownerProfile: VehicleOwnerProfile | null;
  phone: string;
  onPhoneChange: (value: string) => void;
  activeSessionSlotLabel?: string | null;
  onViewActiveSession?: () => void;
  onBack: () => void;
  floors: ParkingFloor[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  pendingReservation?: Reservation | null;
  isLoadingSlots: boolean;
  isDisabled?: boolean;
  t: (vi: string, en: string) => string;
};

export function StaffCheckInConfirmStep({
  vehicle,
  ownerProfile,
  phone,
  onPhoneChange,
  activeSessionSlotLabel,
  onViewActiveSession,
  onBack,
  floors,
  selectedSlotId,
  onSelectSlot,
  pendingReservation,
  isLoadingSlots,
  isDisabled,
  t,
}: StaffCheckInConfirmStepProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const hasActiveConflict = !!activeSessionSlotLabel;
  const ticketLabel = vehicle.monthlyCardId
    ? t('Vé tháng', 'Monthly pass')
    : t('Vé ngày', 'Daily pass');
  const vehicleType = resolveVehicleTypeLabel(vehicle.vehicleTypeId);
  const showPhoneInput = !hasActiveConflict && !ownerProfile?.phone;
  const reservationDriverName = pendingReservation ? getReservationDriverName(pendingReservation) : undefined;
  const reservationSlotLabel = pendingReservation ? formatReservationSlotLabel(pendingReservation) : null;
  const lockSlotSelection = !!pendingReservation && !hasActiveConflict;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable
          disabled={isDisabled}
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}>
          <Ionicons color={DesignColors.ink} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.topText}>
          <ThemedText style={styles.topTitle}>{t('Xác nhận check-in', 'Confirm check-in')}</ThemedText>
          <ThemedText style={styles.topSubtitle}>{vehicle.licensePlate}</ThemedText>
        </View>
      </View>

      {hasActiveConflict ? (
        <View style={styles.conflictCard}>
          <Ionicons color={DesignColors.accentAmber} name="warning-outline" size={22} />
          <View style={styles.conflictBody}>
            <ThemedText style={styles.conflictTitle}>
              {t('Xe đang gửi trong bãi', 'Vehicle is already parked')}
            </ThemedText>
            <ThemedText style={styles.conflictMeta}>{activeSessionSlotLabel}</ThemedText>
            {onViewActiveSession ? (
              <Pressable onPress={onViewActiveSession} style={styles.conflictLink}>
                <ThemedText style={styles.conflictLinkText}>
                  {t('Xem phiên → Checkout', 'View session → Checkout')}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {pendingReservation && !hasActiveConflict ? (
        <View style={styles.reservationCard}>
          <Ionicons color={DesignColors.primaryFocus} name="bookmark-outline" size={22} />
          <View style={styles.reservationBody}>
            <ThemedText style={styles.reservationTitle}>
              {t('Có đặt chỗ PENDING', 'PENDING reservation')}
            </ThemedText>
            <ThemedText style={styles.reservationMeta}>{reservationSlotLabel}</ThemedText>
            {reservationDriverName ? (
              <ThemedText style={styles.reservationDriver}>
                {reservationDriverName}
              </ThemedText>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.ownerCard}>
        <View style={styles.plateRow}>
          <ThemedText style={styles.plate}>{vehicle.licensePlate}</ThemedText>
          <View style={styles.typePill}>
            <ThemedText style={styles.typePillText}>{vehicleType}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.ticketLabel}>{ticketLabel}</ThemedText>

        <View style={styles.divider} />

        <View style={styles.ownerRow}>
          <Ionicons color={DesignColors.inkMuted} name="person-outline" size={18} />
          <ThemedText style={styles.ownerValue}>
            {reservationDriverName ?? ownerProfile?.fullName ?? t('Chưa có tên chủ xe', 'Owner name unavailable')}
          </ThemedText>
        </View>

        {showPhoneInput ? (
          <View style={styles.phoneField}>
            <ThemedText style={styles.phoneLabel}>{t('Số điện thoại khách', 'Customer phone')}</ThemedText>
            <TextInput
              editable={!isDisabled}
              keyboardType="phone-pad"
              onChangeText={onPhoneChange}
              placeholder={t('SĐT KHÁCH (10 SỐ)', 'CUSTOMER PHONE (10 DIGITS)')}
              placeholderTextColor={DesignColors.placeholder}
              style={styles.phoneInput}
              value={phone}
            />
          </View>
        ) : (
          <View style={styles.ownerRow}>
            <Ionicons color={DesignColors.inkMuted} name="call-outline" size={18} />
            <ThemedText style={styles.ownerPhone}>{phone || ownerProfile?.phone || '—'}</ThemedText>
          </View>
        )}
      </View>

      {!hasActiveConflict ? (
        <StaffCheckInSlotPicker
          floors={floors}
          isLoading={isLoadingSlots}
          lockedSlotId={lockSlotSelection ? selectedSlotId : null}
          onSelectSlot={onSelectSlot}
          selectedSlotId={selectedSlotId}
          t={t}
        />
      ) : null}
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    root: {
      gap: Spacing.lg,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topText: {
      flex: 1,
      gap: 2,
    },
    topTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 18,
    },
    topSubtitle: {
      ...Typography.mono,
      color: DesignColors.inkMuted,
      fontSize: 13,
      letterSpacing: 0.5,
    },
    btnPressed: {
      opacity: 0.85,
    },
    conflictCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      backgroundColor: `${DesignColors.accentAmber}14`,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: `${DesignColors.accentAmber}55`,
      padding: Spacing.md,
    },
    conflictBody: {
      flex: 1,
      gap: 4,
    },
    conflictTitle: {
      ...Typography.bodySm,
      color: DesignColors.accentAmber,
      fontWeight: '700',
    },
    conflictMeta: {
      ...Typography.caption,
      color: DesignColors.ink,
      fontSize: 12,
    },
    conflictLink: {
      marginTop: 2,
    },
    conflictLinkText: {
      ...Typography.caption,
      color: DesignColors.primaryFocus,
      fontWeight: '600',
      fontSize: 12,
    },
    reservationCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      backgroundColor: `${DesignColors.primaryFocus}12`,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: `${DesignColors.primaryFocus}44`,
      padding: Spacing.md,
    },
    reservationBody: {
      flex: 1,
      gap: 4,
    },
    reservationTitle: {
      ...Typography.bodySm,
      color: DesignColors.primaryFocus,
      fontWeight: '700',
    },
    reservationMeta: {
      ...Typography.caption,
      color: DesignColors.ink,
      fontSize: 12,
      fontWeight: '600',
    },
    reservationDriver: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontSize: 12,
    },
    ownerCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    plateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    plate: {
      ...Typography.mono,
      color: DesignColors.ink,
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 1,
    },
    typePill: {
      borderRadius: Radius.pill,
      backgroundColor: `${DesignColors.primaryFocus}18`,
      borderWidth: 1,
      borderColor: `${DesignColors.primaryFocus}44`,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    typePillText: {
      ...Typography.caption,
      color: DesignColors.primaryFocus,
      fontWeight: '700',
      fontSize: 11,
    },
    ticketLabel: {
      ...Typography.caption,
      color: DesignColors.neonSuccess,
      fontWeight: '600',
      fontSize: 12,
    },
    divider: {
      height: 1,
      backgroundColor: DesignColors.hairline,
      marginVertical: 4,
    },
    ownerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    ownerValue: {
      ...Typography.body,
      color: DesignColors.ink,
      fontWeight: '600',
      flex: 1,
    },
    ownerPhone: {
      ...Typography.body,
      color: DesignColors.ink,
      fontWeight: '600',
      fontSize: 16,
      letterSpacing: 0.3,
      flex: 1,
    },
    phoneField: {
      gap: 6,
      marginTop: 4,
    },
    phoneLabel: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textTransform: 'uppercase',
      fontSize: 10,
      fontWeight: '600',
    },
    phoneInput: {
      ...Typography.body,
      color: DesignColors.ink,
      backgroundColor: DesignColors.surface3,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      paddingHorizontal: Spacing.md,
      height: 48,
    },
  });
}
