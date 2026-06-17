import { authenticatedFetch } from '@/lib/auth-api';

import type { Reservation } from '@/features/customer/api/reservations';

export type { Reservation };

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
