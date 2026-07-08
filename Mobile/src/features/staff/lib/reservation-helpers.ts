import type { Reservation, ReservationStatus } from '@/features/customer/api/reservations';

export function getReservationSlotId(reservation: Reservation): string | null {
  if (typeof reservation.parkingSlotId === 'string') {
    return reservation.parkingSlotId;
  }
  return reservation.parkingSlotId?._id ?? null;
}

export function getReservationDriverPhone(reservation: Reservation): string | undefined {
  if (typeof reservation.driverId === 'object') {
    return reservation.driverId.phone?.trim() || undefined;
  }
  return undefined;
}

export function getReservationDriverName(reservation: Reservation): string | undefined {
  if (typeof reservation.driverId === 'object') {
    return reservation.driverId.fullName?.trim() || undefined;
  }
  return undefined;
}

export function getReservationSlotNumber(reservation: Reservation): string | undefined {
  if (typeof reservation.parkingSlotId === 'object') {
    return reservation.parkingSlotId.slotNumber?.trim() || undefined;
  }
  return undefined;
}

export function getReservationFloorName(reservation: Reservation): string | undefined {
  if (typeof reservation.parkingSlotId === 'object') {
    return reservation.parkingSlotId.floorId?.floorName?.trim() || undefined;
  }
  return undefined;
}

export function isStaffRelevantReservation(reservation: Reservation): boolean {
  if (reservation.status !== 'PENDING' && reservation.status !== 'CLAIMED') {
    return false;
  }
  if (reservation.status === 'PENDING' && reservation.expiryAt) {
    return new Date(reservation.expiryAt).getTime() > Date.now();
  }
  return true;
}

/** Latest non-expired PENDING/CLAIMED reservation for staff check-in. */
export function findStaffRelevantReservation(reservations: Reservation[]): Reservation | null {
  const sorted = [...reservations].sort((left, right) => {
    const leftTime = new Date(left.reservedAt ?? 0).getTime();
    const rightTime = new Date(right.reservedAt ?? 0).getTime();
    return rightTime - leftTime;
  });

  return sorted.find(isStaffRelevantReservation) ?? null;
}

export function formatReservationSlotLabel(reservation: Reservation): string {
  const slotNumber = getReservationSlotNumber(reservation);
  const floorName = getReservationFloorName(reservation);
  if (slotNumber && floorName) {
    return `${slotNumber} · ${floorName}`;
  }
  return slotNumber ?? floorName ?? '—';
}

export type ReservationsByPlateResult = {
  vehicle: {
    _id: string;
    licensePlate: string;
    vehicleTypeId?: { _id?: string; type?: string };
  };
  reservations: Reservation[];
};
