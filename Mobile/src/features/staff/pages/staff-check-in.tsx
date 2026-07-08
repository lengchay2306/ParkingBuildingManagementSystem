import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';

import { useAppToast } from '@/components/app-toast';
import { StaffCheckInConfirmBar } from '@/features/staff/components/staff-check-in-confirm-bar';
import { StaffCheckInConfirmStep } from '@/features/staff/components/staff-check-in-confirm-step';
import { StaffCheckInPlateStep } from '@/features/staff/components/staff-check-in-plate-step';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import {
  createParkingSession,
  getActiveUserParkingSession,
  getReservationsByLicensePlate,
  getVehicleByLicensePlate,
  resolveVehicleOwnerPhone,
  resolveVehicleOwnerProfile,
  resolveVehicleTypeLabel,
  type ParkingSession,
  type Reservation,
  type StaffActiveParkingSession,
  type StaffVehicle,
  type VehicleOwnerProfile,
} from '@/features/staff/api';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { formatLicensePlateForApi } from '@/features/staff/lib/license-plate-ocr';
import {
  findStaffRelevantReservation,
  formatReservationSlotLabel,
  getReservationDriverPhone,
  getReservationSlotId,
} from '@/features/staff/lib/reservation-helpers';
import { formatTimeLabel, resolveSlotLabel } from '@/features/staff/lib/utils';
import {
  staffPhoneErrorMessage,
  validateStaffPhoneInput,
} from '@/features/staff/lib/session-validation';
import { useLanguagePreference } from '@/hooks/language-preference';
import { STAFF_ROUTES, staffSessionDetailPath } from '@/roles';

type CheckInStep = 'plate' | 'confirm';

export default function StaffCheckInScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const { floors, isLoadingSlots, loadParkingSlots, loadParkingSessions, loadActiveSlotSessions, recordCheckIn } =
    useStaffWorkspace();

  const [step, setStep] = useState<CheckInStep>('plate');
  const [plateQuery, setPlateQuery] = useState('');
  const [isSearchingVehicle, setIsSearchingVehicle] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState<StaffVehicle | null>(null);
  const [pendingReservation, setPendingReservation] = useState<Reservation | null>(null);
  const [activeSession, setActiveSession] = useState<StaffActiveParkingSession | null>(null);
  const [checkInPhone, setCheckInPhone] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const activeSessionSlotLabel = useMemo(() => {
    if (!activeSession) {
      return null;
    }
    return resolveSlotLabel(activeSession.parkingSlotId as ParkingSession['parkingSlotId'], floors);
  }, [activeSession, floors]);

  const ownerProfile = useMemo<VehicleOwnerProfile | null>(() => {
    if (!foundVehicle) {
      return null;
    }
    return resolveVehicleOwnerProfile(foundVehicle, activeSession);
  }, [activeSession, foundVehicle]);

  useFocusEffect(
    useCallback(() => {
      void loadParkingSlots();
    }, [loadParkingSlots]),
  );

  const resetConfirmState = useCallback(() => {
    setFoundVehicle(null);
    setPendingReservation(null);
    setActiveSession(null);
    setCheckInPhone('');
    setSelectedSlotId(null);
  }, []);

  const handleBackToPlate = useCallback(() => {
    setStep('plate');
    resetConfirmState();
  }, [resetConfirmState]);

  const resolveVehicle = useCallback(
    async (plateOverride?: string) => {
      const rawPlate = (plateOverride ?? plateQuery).trim();
      if (!rawPlate) {
        showToast(t('Nhập biển số để tra cứu', 'Enter a license plate to search'), 'error');
        return;
      }

      const plate = formatLicensePlateForApi(rawPlate);
      if (!plate) {
        showToast(
          t('Biển số phải đúng định dạng 51A-123.45', 'License plate must match format 51A-123.45'),
          'error',
        );
        return;
      }

      setIsSearchingVehicle(true);
      try {
        const [vehicle, reservationLookup] = await Promise.all([
          getVehicleByLicensePlate(plate),
          getReservationsByLicensePlate(plate, 'PENDING').catch(() => null),
        ]);
        const existingSession = await getActiveUserParkingSession(vehicle._id);
        const relevantReservation = reservationLookup
          ? findStaffRelevantReservation(reservationLookup.reservations)
          : null;
        const reservedSlotId = relevantReservation ? getReservationSlotId(relevantReservation) : null;
        const reservationPhone = relevantReservation
          ? getReservationDriverPhone(relevantReservation)
          : undefined;

        setFoundVehicle(vehicle);
        setPendingReservation(relevantReservation);
        setPlateQuery(vehicle.licensePlate);
        setActiveSession(existingSession);
        setCheckInPhone(
          reservationPhone || resolveVehicleOwnerPhone(vehicle, existingSession),
        );
        setSelectedSlotId(reservedSlotId);
        setStep('confirm');

        if (existingSession) {
          const slotLabel = resolveSlotLabel(
            existingSession.parkingSlotId as ParkingSession['parkingSlotId'],
            floors,
          );
          showToast(
            t(
              `Xe đang gửi tại ${slotLabel}. Vui lòng checkout trước.`,
              `Vehicle is parked at ${slotLabel}. Checkout first.`,
            ),
            'error',
          );
          return;
        }

        if (relevantReservation) {
          showToast(
            t(
              `Có đặt chỗ tại ${formatReservationSlotLabel(relevantReservation)}`,
              `Reservation found at ${formatReservationSlotLabel(relevantReservation)}`,
            ),
            'success',
          );
          return;
        }

        showToast(t('Không có đặt chỗ — chọn ô trống', 'No reservation — select an available spot'), 'success');
      } catch (error) {
        resetConfirmState();
        showToast(
          error instanceof Error ? error.message : t('Không tìm thấy xe', 'Vehicle not found'),
          'error',
        );
      } finally {
        setIsSearchingVehicle(false);
      }
    },
    [floors, plateQuery, resetConfirmState, showToast, t],
  );

  const handlePlateScanned = useCallback(
    (plate: string) => {
      setPlateQuery(plate);
      showToast(t('Đã quét biển số', 'Plate scanned'), 'success');
      void resolveVehicle(plate);
    },
    [resolveVehicle, showToast, t],
  );

  const handleViewActiveSession = useCallback(() => {
    if (!activeSession?._id) {
      router.push(STAFF_ROUTES.sessions as never);
      return;
    }
    router.push(staffSessionDetailPath(activeSession._id) as never);
  }, [activeSession?._id, router]);

  async function handleCheckIn() {
    if (activeSession) {
      showToast(
        t('Xe đang có phiên ACTIVE. Hãy checkout trước.', 'Vehicle has an active session. Checkout first.'),
        'error',
      );
      return;
    }

    const phoneResult = validateStaffPhoneInput(checkInPhone, t);
    if (!phoneResult.ok) {
      showToast(staffPhoneErrorMessage(phoneResult.messageKey, t), 'error');
      return;
    }

    if (!foundVehicle) {
      showToast(t('Không tìm thấy thông tin xe', 'Vehicle details are missing'), 'error');
      return;
    }

    if (!selectedSlotId) {
      showToast(t('Chọn ô trống', 'Select an available spot'), 'error');
      return;
    }

    setIsCheckingIn(true);
    try {
      const existingSession = await getActiveUserParkingSession(foundVehicle._id);
      if (existingSession) {
        setActiveSession(existingSession);
        showToast(
          t('Xe vừa được check-in. Không thể tạo phiên mới.', 'Vehicle was just checked in. Cannot create a new session.'),
          'error',
        );
        return;
      }

      const session = await createParkingSession({
        phone: phoneResult.phone,
        licensePlate: foundVehicle.licensePlate,
        parkingSlotId: selectedSlotId,
      });
      const refreshedFloors = await loadParkingSlots();
      const slotLabel = resolveSlotLabel(session.parkingSlotId, refreshedFloors ?? floors);
      recordCheckIn({
        id: session._id,
        plate: foundVehicle.licensePlate,
        slotLabel,
        slotId: selectedSlotId,
        status: session.status,
        timeLabel: formatTimeLabel(session.checkInTime),
        checkInTime: session.checkInTime,
        vehicleType: resolveVehicleTypeLabel(foundVehicle.vehicleTypeId),
        sessionType: session.sessionType,
        customerPhone: phoneResult.phone,
      });
      void loadParkingSessions({}, refreshedFloors ?? floors).catch(() => undefined);
      void loadActiveSlotSessions(refreshedFloors ?? floors).catch(() => undefined);

      setStep('plate');
      setPlateQuery('');
      resetConfirmState();
      showToast(t('Check-in thành công', 'Check-in successful'), 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Check-in thất bại', 'Check-in failed'),
        'error',
      );
    } finally {
      setIsCheckingIn(false);
    }
  }

  const canSubmit = !activeSession && checkInPhone.trim().length > 0 && !!selectedSlotId;

  return (
    <StaffPageShell
      footer={
        step === 'confirm' && !activeSession ? (
          <StaffCheckInConfirmBar
            disabled={!canSubmit}
            label={t('Xác nhận vào bãi', 'Confirm Entry')}
            loading={isCheckingIn}
            onPress={handleCheckIn}
          />
        ) : undefined
      }>
      {step === 'plate' ? (
        <StaffCheckInPlateStep
          isSearching={isSearchingVehicle}
          onPlateChange={setPlateQuery}
          onPlateScanned={handlePlateScanned}
          onSearch={() => void resolveVehicle()}
          plateQuery={plateQuery}
          t={t}
        />
      ) : foundVehicle ? (
        <StaffCheckInConfirmStep
          activeSessionSlotLabel={activeSessionSlotLabel}
          floors={floors}
          isDisabled={isCheckingIn}
          isLoadingSlots={isLoadingSlots}
          onBack={handleBackToPlate}
          onPhoneChange={setCheckInPhone}
          onSelectSlot={setSelectedSlotId}
          onViewActiveSession={activeSession ? handleViewActiveSession : undefined}
          ownerProfile={ownerProfile}
          pendingReservation={pendingReservation}
          phone={checkInPhone}
          selectedSlotId={selectedSlotId}
          t={t}
          vehicle={foundVehicle}
        />
      ) : null}
    </StaffPageShell>
  );
}
