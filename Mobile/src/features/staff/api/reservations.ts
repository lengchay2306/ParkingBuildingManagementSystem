import type { Reservation, ReservationStatus } from '@/features/customer/api/reservations';
import { authenticatedFetch } from '@/lib/auth-api';

import type { ReservationsByPlateResult } from '@/features/staff/lib/reservation-helpers';

export type { Reservation, ReservationStatus, ReservationsByPlateResult };

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
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
