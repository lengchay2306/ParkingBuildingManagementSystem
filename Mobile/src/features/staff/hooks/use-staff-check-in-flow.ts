import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAppToast } from '@/components/app-toast';
import {
  createGuestParkingSession,
  createParkingSession,
  createWalkInParkingSession,
  findFirstAvailableSlotForVehicleType,
  getActiveSessionByPlate,
  getActiveUserParkingSession,
  getReservationsByLicensePlate,
  getUserById,
  getVehicleByLicensePlate,
  getVehicleTypes,
  isSlotCompatibleWithVehicleType,
  resolveOwnerUserId,
  resolveVehicleOwnerPhone,
  resolveVehicleOwnerProfile,
  resolveVehicleTypeIdFromSessionOrVehicle,
  enrichReservationOwner,
  type ParkingSession,
  type Reservation,
  type StaffActiveParkingSession,
  type StaffVehicle,
  type VehicleOwnerProfile,
  type VehicleType,
} from '@/features/staff/api';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { formatLicensePlateForApi } from '@/features/staff/lib/license-plate-ocr';
import { isNotFoundApiError, resolveApiErrorMessage } from '@/lib/api-error';
import {
  findStaffRelevantReservation,
  formatReservationSlotLabel,
  getReservationDriverPhone,
  getReservationSlotId,
} from '@/features/staff/lib/reservation-helpers';
import {
  mapParkingSessionToRecord,
  resolveSlotLabel,
} from '@/features/staff/lib/utils';
import {
  isValidStaffPhone,
  staffPhoneErrorMessage,
  validateStaffPhoneInput,
} from '@/features/staff/lib/session-validation';
import { useLanguagePreference } from '@/hooks/language-preference';
import { STAFF_ROUTES, staffSessionDetailPath } from '@/roles';

type CheckInStep = 'idle' | 'confirm';
type CheckInMode = 'registered' | 'guest';

type UseStaffCheckInFlowOptions = {
  onComplete?: () => void;
};

/** BE GET /vehicles/:plate often returns userId as ObjectId only — enrich via GET /users/:id. */
async function loadOwnerProfileForVehicle(
  vehicle: StaffVehicle,
  activeSession?: StaffActiveParkingSession | null,
): Promise<VehicleOwnerProfile | null> {
  const embedded = resolveVehicleOwnerProfile(vehicle, activeSession);
  if (embedded?.fullName?.trim()) {
    return embedded;
  }

  const userId = resolveOwnerUserId(vehicle.userId);
  if (!userId) {
    return embedded;
  }

  try {
    const user = await getUserById(userId);
    const fullName = user.fullName?.trim() || embedded?.fullName;
    const phone = user.phone?.trim() || embedded?.phone;
    if (!fullName && !phone) {
      return embedded;
    }
    return {
      fullName: fullName || undefined,
      phone: phone || undefined,
    };
  } catch {
    return embedded;
  }
}

export function useStaffCheckInFlow(options: UseStaffCheckInFlowOptions = {}) {
  const onCompleteRef = useRef(options.onComplete);
  onCompleteRef.current = options.onComplete;
  const router = useRouter();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const { floors, isLoadingSlots, loadParkingSlots, loadParkingSessions, loadActiveSlotSessions, recordCheckIn } =
    useStaffWorkspace();

  const [step, setStep] = useState<CheckInStep>('idle');
  const [checkInMode, setCheckInMode] = useState<CheckInMode>('registered');
  const [plateQuery, setPlateQuery] = useState('');
  const [guestPlate, setGuestPlate] = useState('');
  const [isSearchingVehicle, setIsSearchingVehicle] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState<StaffVehicle | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<VehicleOwnerProfile | null>(null);
  const [pendingReservation, setPendingReservation] = useState<Reservation | null>(null);
  const [activeSession, setActiveSession] = useState<StaffActiveParkingSession | null>(null);
  const [activeSessionByPlate, setActiveSessionByPlate] = useState<ParkingSession | null>(null);
  const [checkInPhone, setCheckInPhone] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState<string | null>(null);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  useEffect(() => {
    void getVehicleTypes()
      .then(setVehicleTypes)
      .catch((error) => {
        setVehicleTypes([]);
        showToast(
          resolveApiErrorMessage(
            error,
            t('Không tải được loại xe', 'Could not load vehicle types'),
          ),
          'error',
        );
      });
  }, [showToast, t]);

  const activeSessionSlotLabel = useMemo(() => {
    if (activeSession) {
      return resolveSlotLabel(activeSession.parkingSlotId as ParkingSession['parkingSlotId'], floors);
    }
    if (activeSessionByPlate) {
      return resolveSlotLabel(activeSessionByPlate.parkingSlotId, floors);
    }
    return null;
  }, [activeSession, activeSessionByPlate, floors]);

  const resetConfirmState = useCallback(() => {
    setFoundVehicle(null);
    setOwnerProfile(null);
    setGuestPlate('');
    setCheckInMode('registered');
    setPendingReservation(null);
    setActiveSession(null);
    setActiveSessionByPlate(null);
    setCheckInPhone('');
    setSelectedSlotId(null);
    setSelectedVehicleTypeId(null);
  }, []);

  const resetFlow = useCallback(() => {
    setStep('idle');
    setPlateQuery('');
    resetConfirmState();
  }, [resetConfirmState]);

  const resolveVehicle = useCallback(
    async (plateOverride?: string): Promise<boolean> => {
      const rawPlate = (plateOverride ?? plateQuery).trim();
      if (!rawPlate) {
        showToast(t('Nhập biển số để tra cứu', 'Enter a license plate to search'), 'error');
        return false;
      }

      const plate = formatLicensePlateForApi(rawPlate);
      if (!plate) {
        showToast(
          t('Biển số phải đúng định dạng 51A-123.44', 'License plate must match format 51A-123.44'),
          'error',
        );
        return false;
      }

      setIsSearchingVehicle(true);
      try {
        const [sessionByPlate, reservationLookup] = await Promise.all([
          getActiveSessionByPlate(plate),
          getReservationsByLicensePlate(plate, 'PENDING').catch((error) => {
            if (isNotFoundApiError(error)) {
              return null;
            }
            throw error;
          }),
        ]);
        const relevantReservationRaw = reservationLookup
          ? findStaffRelevantReservation(reservationLookup.reservations)
          : null;
        const relevantReservation = relevantReservationRaw
          ? await enrichReservationOwner(relevantReservationRaw)
          : null;
        const reservedSlotId = relevantReservation ? getReservationSlotId(relevantReservation) : null;
        const reservationPhone = relevantReservation
          ? getReservationDriverPhone(relevantReservation)
          : undefined;

        setActiveSessionByPlate(sessionByPlate ?? null);

        try {
          const vehicle = await getVehicleByLicensePlate(plate);
          const existingSession = await getActiveUserParkingSession(vehicle._id);
          const enrichedOwner = await loadOwnerProfileForVehicle(vehicle, existingSession);

          setCheckInMode('registered');
          setFoundVehicle(vehicle);
          setOwnerProfile(enrichedOwner);
          setGuestPlate('');
          setPendingReservation(relevantReservation);
          setPlateQuery(vehicle.licensePlate);
          setActiveSession(existingSession ?? (sessionByPlate as StaffActiveParkingSession | null));
          setCheckInPhone(
            reservationPhone ||
              enrichedOwner?.phone ||
              resolveVehicleOwnerPhone(vehicle, existingSession),
          );
          setSelectedSlotId(reservedSlotId);
          setSelectedVehicleTypeId(resolveVehicleTypeIdFromSessionOrVehicle(vehicle.vehicleTypeId));
          setStep('confirm');

          if (existingSession || sessionByPlate) {
            const slotLabel = resolveSlotLabel(
              (existingSession ?? sessionByPlate)!.parkingSlotId as ParkingSession['parkingSlotId'],
              floors,
            );
            showToast(
              t(
                `Xe đang gửi tại ${slotLabel}. Vui lòng checkout trước.`,
                `Vehicle is parked at ${slotLabel}. Checkout first.`,
              ),
              'error',
            );
            return true;
          }

          if (relevantReservation) {
            showToast(
              t(
                `Có đặt chỗ tại ${formatReservationSlotLabel(relevantReservation)}`,
                `Reservation found at ${formatReservationSlotLabel(relevantReservation)}`,
              ),
              'success',
            );
            return true;
          }

          const vehicleTypeId = resolveVehicleTypeIdFromSessionOrVehicle(vehicle.vehicleTypeId);
          if (vehicleTypeId) {
            const autoSlot = findFirstAvailableSlotForVehicleType(floors, vehicleTypeId);
            if (autoSlot) {
              setSelectedSlotId(autoSlot.slot._id);
            }
          }

          showToast(t('Không có đặt chỗ — chọn ô trống', 'No reservation — select an available spot'), 'success');
          return true;
        } catch (lookupError) {
          if (!isNotFoundApiError(lookupError)) {
            throw lookupError;
          }

          setCheckInMode('guest');
          setFoundVehicle(null);
          setOwnerProfile(null);
          setGuestPlate(plate);
          setPendingReservation(relevantReservation);
          setPlateQuery(plate);
          setActiveSession(null);
          setCheckInPhone(reservationPhone ?? '');
          setSelectedSlotId(reservedSlotId);
          setSelectedVehicleTypeId(vehicleTypes[0]?._id ?? null);
          setStep('confirm');

          if (sessionByPlate) {
            showToast(
              t('Xe đang gửi trong bãi. Chuyển sang checkout.', 'Vehicle is in lot. Proceed to checkout.'),
              'error',
            );
            return true;
          }

          if (relevantReservation) {
            showToast(
              t(
                `Có đặt chỗ tại ${formatReservationSlotLabel(relevantReservation)}`,
                `Reservation found at ${formatReservationSlotLabel(relevantReservation)}`,
              ),
              'success',
            );
            return true;
          }

          showToast(t('Khách vãng lai — chọn loại xe và ô trống', 'Walk-in — select vehicle type and spot'), 'success');
          return true;
        }
      } catch (error) {
        resetConfirmState();
        setStep('idle');
        showToast(
          error instanceof Error ? error.message : t('Không tra cứu được biển số', 'Could not look up plate'),
          'error',
        );
        return false;
      } finally {
        setIsSearchingVehicle(false);
      }
    },
    [floors, plateQuery, resetConfirmState, showToast, t, vehicleTypes],
  );

  const handleViewActiveSession = useCallback(() => {
    const sessionId = activeSession?._id ?? activeSessionByPlate?._id;
    if (!sessionId) {
      router.push(STAFF_ROUTES.sessions as never);
      return;
    }
    router.push(staffSessionDetailPath(sessionId) as never);
  }, [activeSession?._id, activeSessionByPlate?._id, router]);

  const finalizeCheckIn = useCallback(
    async (session: ParkingSession, plate: string) => {
      const refreshedFloors = await loadParkingSlots();
      const slotLabel = resolveSlotLabel(session.parkingSlotId, refreshedFloors ?? floors);
      const record = mapParkingSessionToRecord(session, refreshedFloors ?? floors);
      recordCheckIn({
        ...record,
        plate: record.plate !== '—' ? record.plate : plate,
        slotLabel,
        slotId: selectedSlotId ?? record.slotId,
      });
      void loadParkingSessions({}, refreshedFloors ?? floors).catch((error) => {
        showToast(
          resolveApiErrorMessage(
            error,
            t('Không làm mới danh sách phiên', 'Could not refresh sessions'),
          ),
          'error',
        );
      });
      void loadActiveSlotSessions(refreshedFloors ?? floors).catch((error) => {
        showToast(
          resolveApiErrorMessage(
            error,
            t('Không làm mới trạng thái ô', 'Could not refresh spot status'),
          ),
          'error',
        );
      });

      resetFlow();
      showToast(t('Check-in thành công', 'Check-in successful'), 'success');
      onCompleteRef.current?.();
    },
    [
      floors,
      loadActiveSlotSessions,
      loadParkingSessions,
      loadParkingSlots,
      recordCheckIn,
      resetFlow,
      selectedSlotId,
      showToast,
      t,
    ],
  );

  const handleCheckIn = useCallback(async () => {
    const hasActiveConflict = !!activeSession || !!activeSessionByPlate;
    if (hasActiveConflict) {
      showToast(
        t('Xe đang có phiên ACTIVE. Hãy checkout trước.', 'Vehicle has an active session. Checkout first.'),
        'error',
      );
      return;
    }

    if (pendingReservation) {
      setIsCheckingIn(true);
      try {
        const session = await createParkingSession({ reservationId: pendingReservation._id });
        await finalizeCheckIn(session, plateQuery);
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : t('Check-in thất bại', 'Check-in failed'),
          'error',
        );
      } finally {
        setIsCheckingIn(false);
      }
      return;
    }

    if (checkInMode === 'registered' && foundVehicle) {
      if (!selectedSlotId) {
        showToast(t('Chọn ô trống', 'Select an available spot'), 'error');
        return;
      }

      const vehicleTypeId = resolveVehicleTypeIdFromSessionOrVehicle(foundVehicle.vehicleTypeId);
      if (
        !vehicleTypeId ||
        !isSlotCompatibleWithVehicleType(floors, selectedSlotId, vehicleTypeId)
      ) {
        showToast(
          t(
            'Ô gửi phải cùng loại xe với tầng tương ứng',
            'Spot must match the vehicle type of its floor',
          ),
          'error',
        );
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

        const session = await createWalkInParkingSession({
          licensePlate: foundVehicle.licensePlate,
          parkingSlotId: selectedSlotId,
        });
        await finalizeCheckIn(session, foundVehicle.licensePlate);
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : t('Check-in thất bại', 'Check-in failed'),
          'error',
        );
      } finally {
        setIsCheckingIn(false);
      }
      return;
    }

    const phoneResult = validateStaffPhoneInput(checkInPhone, t);
    if (!phoneResult.ok) {
      showToast(staffPhoneErrorMessage(phoneResult.messageKey, t), 'error');
      return;
    }
    if (!selectedSlotId) {
      showToast(t('Chọn ô trống', 'Select an available spot'), 'error');
      return;
    }
    if (!selectedVehicleTypeId) {
      showToast(t('Chọn loại xe', 'Select vehicle type'), 'error');
      return;
    }
    if (!isSlotCompatibleWithVehicleType(floors, selectedSlotId, selectedVehicleTypeId)) {
      showToast(
        t(
          'Ô gửi phải cùng loại xe với tầng tương ứng',
          'Spot must match the vehicle type of its floor',
        ),
        'error',
      );
      return;
    }

    const guestLicensePlate = formatLicensePlateForApi(guestPlate || plateQuery);
    if (!guestLicensePlate) {
      showToast(
        t('Biển số phải đúng định dạng 51A-123.44', 'License plate must match format 51A-123.44'),
        'error',
      );
      return;
    }

    setIsCheckingIn(true);
    try {
      const session = await createGuestParkingSession({
        licensePlate: guestLicensePlate,
        parkingSlotId: selectedSlotId,
        vehicleTypeId: selectedVehicleTypeId,
        phone: phoneResult.phone,
      });
      await finalizeCheckIn(session, guestLicensePlate);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Check-in thất bại', 'Check-in failed'),
        'error',
      );
    } finally {
      setIsCheckingIn(false);
    }
  }, [
    activeSession,
    activeSessionByPlate,
    checkInMode,
    checkInPhone,
    finalizeCheckIn,
    floors,
    foundVehicle,
    guestPlate,
    pendingReservation,
    plateQuery,
    selectedSlotId,
    selectedVehicleTypeId,
    showToast,
    t,
  ]);

  const hasActiveConflict = !!activeSession || !!activeSessionByPlate;
  const guestPlateValid =
    checkInMode !== 'guest' || !!formatLicensePlateForApi(guestPlate || plateQuery);
  const canSubmit =
    step === 'confirm' &&
    !hasActiveConflict &&
    !!selectedSlotId &&
    (Boolean(pendingReservation) ||
      (checkInMode === 'registered' && !!foundVehicle) ||
      (checkInMode === 'guest' &&
        !!selectedVehicleTypeId &&
        guestPlateValid &&
        isValidStaffPhone(checkInPhone)));

  const handleBackToIdle = useCallback(() => {
    resetFlow();
  }, [resetFlow]);

  return {
    step,
    checkInMode,
    plateQuery,
    setPlateQuery,
    guestPlate,
    isSearchingVehicle,
    foundVehicle,
    pendingReservation,
    activeSessionByPlate,
    checkInPhone,
    setCheckInPhone,
    selectedSlotId,
    setSelectedSlotId,
    selectedVehicleTypeId,
    setSelectedVehicleTypeId,
    vehicleTypes,
    isCheckingIn,
    floors,
    isLoadingSlots,
    loadParkingSlots,
    activeSessionSlotLabel,
    ownerProfile,
    hasActiveConflict,
    canSubmit,
    resolveVehicle,
    handleCheckIn,
    handleViewActiveSession,
    handleBackToIdle,
    resetFlow,
  };
}
