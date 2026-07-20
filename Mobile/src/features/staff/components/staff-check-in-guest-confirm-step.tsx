import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { StaffBackButton } from '@/features/staff/components/staff-back-button';
import { StaffCheckInSlotPicker } from '@/features/staff/components/staff-check-in-slot-picker';
import type { ParkingFloor, Reservation, VehicleType } from '@/features/staff/api';
import {
  findFirstAvailableSlotForVehicleType,
  type ParkingSession,
} from '@/features/staff/api';
import {
  formatReservationSlotLabel,
  getReservationDriverName,
} from '@/features/staff/lib/reservation-helpers';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';

type StaffCheckInGuestConfirmStepProps = {
  plate: string;
  phone: string;
  onPhoneChange: (value: string) => void;
  activeSession?: ParkingSession | null;
  activeSessionSlotLabel?: string | null;
  onViewActiveSession?: () => void;
  onBack: () => void;
  floors: ParkingFloor[];
  vehicleTypes: VehicleType[];
  selectedVehicleTypeId: string | null;
  onSelectVehicleType: (id: string) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string | null) => void;
  pendingReservation?: Reservation | null;
  isLoadingSlots: boolean;
  isDisabled?: boolean;
  t: (vi: string, en: string) => string;
  hideTopBar?: boolean;
};

export function StaffCheckInGuestConfirmStep({
  plate,
  phone,
  onPhoneChange,
  activeSession,
  activeSessionSlotLabel,
  onViewActiveSession,
  onBack,
  floors,
  vehicleTypes,
  selectedVehicleTypeId,
  onSelectVehicleType,
  selectedSlotId,
  onSelectSlot,
  pendingReservation,
  isLoadingSlots,
  isDisabled,
  t,
  hideTopBar = false,
}: StaffCheckInGuestConfirmStepProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const hasActiveConflict = !!activeSession || !!activeSessionSlotLabel;
  const reservationDriverName = pendingReservation ? getReservationDriverName(pendingReservation) : undefined;
  const reservationSlotLabel = pendingReservation ? formatReservationSlotLabel(pendingReservation) : null;
  const lockSlotSelection = !!pendingReservation && !hasActiveConflict;

  useEffect(() => {
    if (!selectedVehicleTypeId || pendingReservation || hasActiveConflict) {
      return;
    }
    const match = findFirstAvailableSlotForVehicleType(floors, selectedVehicleTypeId);
    if (match && !selectedSlotId) {
      onSelectSlot(match.slot._id);
    }
  }, [
    floors,
    hasActiveConflict,
    onSelectSlot,
    pendingReservation,
    selectedSlotId,
    selectedVehicleTypeId,
  ]);

  return (
    <View style={styles.root}>
      {hideTopBar ? null : (
        <View style={styles.topBar}>
          <StaffBackButton disabled={isDisabled} onPress={onBack} size={28} />
          <View style={styles.topText}>
            <ThemedText style={styles.topTitle}>
              {pendingReservation
                ? t('Check-in đặt chỗ', 'Reservation check-in')
                : t('Khách vãng lai', 'Walk-in guest')}
            </ThemedText>
            <ThemedText style={styles.topSubtitle}>{plate}</ThemedText>
          </View>
        </View>
      )}

      {hasActiveConflict ? (
        <View style={styles.conflictCard}>
          <Ionicons color={DesignColors.accentAmber} name="warning-outline" size={22} />
          <View style={styles.conflictBody}>
            <ThemedText style={styles.conflictTitle}>
              {t('Xe đang gửi trong bãi', 'Vehicle is already parked')}
            </ThemedText>
            {activeSessionSlotLabel ? (
              <ThemedText style={styles.conflictMeta}>{activeSessionSlotLabel}</ThemedText>
            ) : null}
            {onViewActiveSession ? (
              <Pressable hitSlop={6} onPress={onViewActiveSession} style={styles.conflictLink}>
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
              <ThemedText style={styles.reservationDriver}>{reservationDriverName}</ThemedText>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.ownerCard}>
        <View style={styles.plateRow}>
          <ThemedText style={styles.plate}>{plate}</ThemedText>
          <View style={styles.typePill}>
            <ThemedText style={styles.typePillText}>{t('Vãng lai', 'Walk-in')}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.hint}>
          {t(
            'Nhập SĐT khách vãng lai để liên hệ / checkout.',
            'Enter guest phone for contact / checkout.',
          )}
        </ThemedText>

        <View style={styles.phoneField}>
          <ThemedText style={styles.phoneLabel}>{t('Số điện thoại (bắt buộc)', 'Phone (required)')}</ThemedText>
          <TextInput
            editable={!isDisabled}
            keyboardType="phone-pad"
            onChangeText={onPhoneChange}
            placeholder={t('SĐT khách (10 số)', 'Customer phone (10 digits)')}
            placeholderTextColor={DesignColors.placeholder}
            style={styles.phoneInput}
            value={phone}
          />
        </View>
      </View>

      {!hasActiveConflict && !pendingReservation ? (
        <View style={styles.typeSection}>
          <ThemedText style={styles.sectionLabel}>{t('Loại xe', 'Vehicle type')}</ThemedText>
          <View style={styles.typeRow}>
            {vehicleTypes.map((type) => {
              const selected = selectedVehicleTypeId === type._id;
              return (
                <Pressable
                  key={type._id}
                  disabled={isDisabled}
                  onPress={() => onSelectVehicleType(type._id)}
                  style={({ pressed }) => [
                    styles.typeChip,
                    selected && styles.typeChipSelected,
                    pressed && styles.btnPressed,
                  ]}>
                  <ThemedText style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                    {type.type}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {!hasActiveConflict ? (
        <StaffCheckInSlotPicker
          floors={floors}
          isLoading={isLoadingSlots}
          lockedSlotId={lockSlotSelection ? selectedSlotId : null}
          onSelectSlot={onSelectSlot}
          selectedSlotId={selectedSlotId}
          t={t}
          vehicleTypeId={selectedVehicleTypeId}
        />
      ) : null}
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
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
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
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
      transform: [{ scale: 0.98 }],
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
      minHeight: 44,
      justifyContent: 'center',
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
      backgroundColor: DesignColors.surface2,
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
      backgroundColor: `${DesignColors.accentAmber}18`,
      borderWidth: 1,
      borderColor: `${DesignColors.accentAmber}44`,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    typePillText: {
      ...Typography.caption,
      color: DesignColors.accentAmber,
      fontWeight: '700',
      fontSize: 11,
    },
    hint: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontSize: 12,
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
      minHeight: 48,
    },
    typeSection: {
      gap: Spacing.sm,
    },
    sectionLabel: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontSize: 10,
      fontWeight: '600',
    },
    typeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    typeChip: {
      minHeight: 44,
      minWidth: 72,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeChipSelected: {
      borderColor: DesignColors.primaryFocus,
      backgroundColor: `${DesignColors.primaryFocus}18`,
    },
    typeChipText: {
      ...Typography.button,
      color: DesignColors.inkMuted,
      fontSize: 13,
    },
    typeChipTextSelected: {
      color: DesignColors.ink,
      fontWeight: '700',
    },
  });
}
