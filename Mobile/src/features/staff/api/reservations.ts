import type { Reservation, ReservationStatus } from '@/features/customer/api/reservations';

import { authenticatedFetch } from '@/lib/auth-api';
import { getUserById, resolveOwnerUserId } from '@/features/staff/api/users';
import {
  getReservationDriverName,
  getReservationDriverPhone,
  getReservationSlotId,
  isStaffRelevantReservation,
  type ReservationsByPlateResult,
} from '@/features/staff/lib/reservation-helpers';

export type { Reservation, ReservationStatus, ReservationsByPlateResult };

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

type ReservationsListData = {
  reservations?: Reservation[];
  pagination?: {
    page?: number;
    limit?: number;
    totalCount?: number;
    totalPages?: number;
  };
};

async function parseReservationApiResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    throw new Error(payload?.message ?? 'Request failed');
  }
  return payload ?? {};
}

/** GET /reservations/by-plate/:licensePlate — staff lookup after plate scan. */
export async function getReservationsByLicensePlate(
  licensePlate: string,
  status?: ReservationStatus,
): Promise<ReservationsByPlateResult> {
  const trimmed = licensePlate.trim().toUpperCase();
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await authenticatedFetch(
    `/reservations/by-plate/${encodeURIComponent(trimmed)}${query}`,
  );
  const result = await parseReservationApiResponse<ReservationsByPlateResult>(response);
  if (!result.data?.vehicle) {
    throw new Error(result.message ?? 'Reservation lookup response is missing vehicle data');
  }
  return {
    vehicle: result.data.vehicle,
    reservations: result.data.reservations ?? [],
  };
}

/**
 * Find a PENDING/CLAIMED reservation for a RESERVED spot.
 * Uses existing GET /reservations (no dedicated by-slot BE route).
 */
export async function getPendingReservationBySlot(parkingSlotId: string): Promise<Reservation | null> {
  const slotId = parkingSlotId.trim();
  if (!slotId) {
    return null;
  }

  const reservations = await listPendingReservations();
  const match = reservations.find((reservation) => {
    if (!isStaffRelevantReservation(reservation)) {
      return false;
    }
    return getReservationSlotId(reservation) === slotId;
  });

  return match ? enrichReservationDriver(match) : null;
}

/** Paginated GET /reservations?status=PENDING for staff pickers. */
export async function listPendingReservations(): Promise<Reservation[]> {
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  const all: Reservation[] = [];

  while (page <= totalPages && page <= 10) {
    const response = await authenticatedFetch(
      `/reservations?page=${page}&limit=${pageSize}&status=PENDING`,
    );
    const result = await parseReservationApiResponse<ReservationsListData>(response);
    const reservations = result.data?.reservations ?? [];
    totalPages = Math.max(1, result.data?.pagination?.totalPages ?? 1);
    all.push(...reservations.filter(isStaffRelevantReservation));
    page += 1;
  }

  return all;
}

/** When list APIs return driverId as ObjectId only, fill name/phone via GET /users/:id. */
async function enrichReservationDriver(reservation: Reservation): Promise<Reservation> {
  if (getReservationDriverName(reservation) || getReservationDriverPhone(reservation)) {
    return reservation;
  }

  const driverId = resolveOwnerUserId(
    typeof reservation.driverId === 'string'
      ? reservation.driverId
      : reservation.driverId?._id
        ? { _id: reservation.driverId._id }
        : null,
  );
  if (!driverId) {
    return reservation;
  }

  try {
    const user = await getUserById(driverId);
    const existing = typeof reservation.driverId === 'object' ? reservation.driverId : { _id: driverId };
    return {
      ...reservation,
      driverId: {
        ...existing,
        _id: user._id || existing._id,
        fullName: user.fullName?.trim() || existing.fullName,
        phone: user.phone?.trim() || existing.phone,
      },
    };
  } catch {
    return reservation;
  }
}

/** Ensure reservation driver has name/phone when APIs return bare ObjectIds. */
export async function enrichReservationOwner(reservation: Reservation): Promise<Reservation> {
  return enrichReservationDriver(reservation);
}

/** DELETE /reservations/manage/:reservationId — hard-delete a PENDING reservation. */
export async function deleteManagedReservation(reservationId: string): Promise<Reservation> {
  const trimmed = reservationId.trim();
  const response = await authenticatedFetch(`/reservations/manage/${encodeURIComponent(trimmed)}`, {
    method: 'DELETE',
  });
  const result = await parseReservationApiResponse<{ deletedReservation?: Reservation }>(response);
  const reservation = result.data?.deletedReservation;
  if (!reservation) {
    throw new Error(result.message ?? 'Delete response is missing data');
  }
  return reservation;
}
