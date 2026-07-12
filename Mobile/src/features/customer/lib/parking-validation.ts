import type { Reservation } from '@/features/customer/api/reservations';

export function getReservationVehicleId(reservation: Reservation): string | null {
  if (typeof reservation.vehicleId === 'string') {
    return reservation.vehicleId;
  }
  return reservation.vehicleId?._id ?? null;
}

export function getReservationSlotId(reservation: Reservation): string | null {
  if (typeof reservation.parkingSlotId === 'string') {
    return reservation.parkingSlotId;
  }
  return reservation.parkingSlotId?._id ?? null;
}

/** Slot ids from the driver's active PENDING reservations. */
export function collectMyReservedSlotIds(reservations: Reservation[]): Set<string> {
  const ids = new Set<string>();
  for (const reservation of reservations) {
    if (reservation.status !== 'PENDING') {
      continue;
    }
    const slotId = getReservationSlotId(reservation);
    if (slotId) {
      ids.add(slotId);
    }
  }
  return ids;
}

/** Mirrors FE `findPendingReservationForVehicle`. */
export function findPendingReservationForVehicle(
  vehicleId: string,
  reservations: Reservation[],
): Reservation | null {
  return (
    reservations.find(
      (reservation) =>
        reservation.status === 'PENDING' && getReservationVehicleId(reservation) === vehicleId,
    ) ?? null
  );
}

/**
 * Mirrors FE `getVehicleReserveBlockReason` (reservation + optional active session).
 * One vehicle may only hold one active booking at a time.
 */
export function getVehicleReserveBlockReason(
  vehicleId: string,
  reservations: Reservation[],
  options?: { hasActiveSession?: boolean },
): string | null {
  if (options?.hasActiveSession) {
    return 'Xe này đang gửi trong bãi, không thể đặt chỗ thêm.';
  }

  if (findPendingReservationForVehicle(vehicleId, reservations)) {
    return 'Xe này đã có đặt chỗ đang hoạt động (PENDING).';
  }

  return null;
}

export function getVehicleReserveBlockReasonLocalized(
  vehicleId: string,
  reservations: Reservation[],
  t: (vi: string, en: string) => string,
  options?: { hasActiveSession?: boolean },
): string | null {
  if (options?.hasActiveSession) {
    return t(
      'Xe này đang gửi trong bãi, không thể đặt chỗ thêm.',
      'This vehicle is already parked; cannot reserve another slot.',
    );
  }

  if (findPendingReservationForVehicle(vehicleId, reservations)) {
    return t(
      'Xe này đã có đặt chỗ đang hoạt động (PENDING).',
      'This vehicle already has an active PENDING reservation.',
    );
  }

  return null;
}
