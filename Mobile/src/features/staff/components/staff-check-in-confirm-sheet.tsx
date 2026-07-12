import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/design';
import { StaffCheckInConfirmBar } from '@/features/staff/components/staff-check-in-confirm-bar';
import { StaffCheckInConfirmStep } from '@/features/staff/components/staff-check-in-confirm-step';
import { StaffCheckInGuestConfirmStep } from '@/features/staff/components/staff-check-in-guest-confirm-step';
import { StaffSlideSheet } from '@/features/staff/components/staff-slide-sheet';
import { StaffFadeSwitch } from '@/features/staff/motion/staff-motion';
import type { useStaffCheckInFlow } from '@/features/staff/hooks/use-staff-check-in-flow';

type CheckInFlow = ReturnType<typeof useStaffCheckInFlow>;

type StaffCheckInConfirmSheetProps = {
  visible: boolean;
  flow: CheckInFlow;
  onClose: () => void;
  t: (vi: string, en: string) => string;
};

export function StaffCheckInConfirmSheet({ visible, flow, onClose, t }: StaffCheckInConfirmSheetProps) {
  const {
    step,
    checkInMode,
    foundVehicle,
    ownerProfile,
    checkInPhone,
    setCheckInPhone,
    activeSessionSlotLabel,
    handleViewActiveSession,
    floors,
    selectedSlotId,
    setSelectedSlotId,
    pendingReservation,
    isLoadingSlots,
    isCheckingIn,
    hasActiveConflict,
    guestPlate,
    plateQuery,
    activeSessionByPlate,
    vehicleTypes,
    selectedVehicleTypeId,
    setSelectedVehicleTypeId,
    canSubmit,
    handleCheckIn,
    handleBackToIdle,
  } = flow;

  const plateLabel = guestPlate || plateQuery || foundVehicle?.licensePlate || '';

  return (
    <StaffSlideSheet
      coverTabBar
      footer={
        step === 'confirm' && !hasActiveConflict ? (
          <StaffCheckInConfirmBar
            compact
            disabled={!canSubmit}
            label={t('Xác nhận vào bãi', 'Confirm Entry')}
            loading={isCheckingIn}
            onPress={() => void handleCheckIn()}
            style={styles.confirmBar}
          />
        ) : undefined
      }
      maxHeightRatio={0.92}
      subtitle={plateLabel}
      title={t('Xác nhận check-in', 'Confirm check-in')}
      visible={visible && step === 'confirm'}
      onClose={() => {
        handleBackToIdle();
        onClose();
      }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}>
        <StaffFadeSwitch switchKey={checkInMode === 'guest' ? 'guest' : 'registered'}>
          {checkInMode === 'guest' ? (
            <StaffCheckInGuestConfirmStep
              activeSession={activeSessionByPlate}
              activeSessionSlotLabel={activeSessionSlotLabel}
              floors={floors}
              hideTopBar
              isDisabled={isCheckingIn}
              isLoadingSlots={isLoadingSlots}
              onBack={() => {
                handleBackToIdle();
                onClose();
              }}
              onPhoneChange={setCheckInPhone}
              onSelectSlot={setSelectedSlotId}
              onSelectVehicleType={setSelectedVehicleTypeId}
              onViewActiveSession={hasActiveConflict ? handleViewActiveSession : undefined}
              pendingReservation={pendingReservation}
              phone={checkInPhone}
              plate={guestPlate || plateQuery}
              selectedSlotId={selectedSlotId}
              selectedVehicleTypeId={selectedVehicleTypeId}
              t={t}
              vehicleTypes={vehicleTypes}
            />
          ) : foundVehicle ? (
            <StaffCheckInConfirmStep
              activeSessionSlotLabel={activeSessionSlotLabel}
              floors={floors}
              hideTopBar
              isDisabled={isCheckingIn}
              isLoadingSlots={isLoadingSlots}
              onBack={() => {
                handleBackToIdle();
                onClose();
              }}
              onPhoneChange={setCheckInPhone}
              onSelectSlot={setSelectedSlotId}
              onViewActiveSession={hasActiveConflict ? handleViewActiveSession : undefined}
              ownerProfile={ownerProfile}
              pendingReservation={pendingReservation}
              phone={checkInPhone}
              selectedSlotId={selectedSlotId}
              t={t}
              vehicle={foundVehicle}
            />
          ) : null}
        </StaffFadeSwitch>
      </ScrollView>
    </StaffSlideSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  confirmBar: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
});
