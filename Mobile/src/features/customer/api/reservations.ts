import { authenticatedFetch } from '@/lib/auth-api';

export type ReservationStatus = 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';

export type ReservationDriver = {
  _id: string;
  fullName?: string;
  email?: string;
  phone?: string;
};

export type Reservation = {
  _id: string;
  driverId: string | ReservationDriver;
  vehicleId:
    | string
    | {
        _id: string;
        licensePlate?: string;
        vehicleTypeId?: { _id?: string; type?: string };
      };
  parkingSlotId:
    | string
    | {
        _id: string;
        slotNumber?: string;
        status?: string;
        floorId?: {
          _id?: string;
          floorName?: string;
          vehicleTypeId?: { _id?: string; type?: string };
        };
      };
  reservedAt?: string;
  expectedArrival?: string;
  expiryAt?: string;
  createdAt?: string;
  updatedAt?: string;
  status: ReservationStatus | string;
};

export type CreateReservationPayload = {
  vehicleId: string;
  parkingSlotId: string;
  expectedArrival: string;
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

async function parseReservationResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    throw new Error(payload?.message ?? 'Request failed');
  }
  return payload ?? {};
}

/** Newest → oldest. Uses reservedAt / createdAt / ObjectId time (Mobile-only; no BE change). */
export function sortReservationsNewestFirst(list: Reservation[]): Reservation[] {
  return [...list].sort((a, b) => reservationRecencyMs(b) - reservationRecencyMs(a));
}

function reservationRecencyMs(reservation: Reservation): number {
  for (const value of [reservation.reservedAt, reservation.createdAt, reservation.updatedAt]) {
    if (!value) {
      continue;
    }
    const ms = new Date(value).getTime();
    if (!Number.isNaN(ms)) {
      return ms;
    }
  }
  // Mongo ObjectId embeds creation time in the first 4 bytes.
  if (reservation._id && /^[a-f\d]{24}$/i.test(reservation._id)) {
    return Number.parseInt(reservation._id.slice(0, 8), 16) * 1000;
  }
  return 0;
}

export async function getMyReservations(
  status?: ReservationStatus,
  options?: { page?: number; limit?: number },
): Promise<Reservation[]> {
  const params = new URLSearchParams();
  if (status) {
    params.set('status', status);
  }
  if (options?.page) {
    params.set('page', String(options.page));
  }
  if (options?.limit) {
    params.set('limit', String(options.limit));
  }
  const query = params.toString();
  const response = await authenticatedFetch(`/reservations/my${query ? `?${query}` : ''}`);
  const payload = await parseReservationResponse<{ reservations?: Reservation[] }>(response);
  return sortReservationsNewestFirst(payload.data?.reservations ?? []);
}

export async function createReservation(payload: CreateReservationPayload): Promise<Reservation> {
  const response = await authenticatedFetch('/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseReservationResponse<{ reservation?: Reservation }>(response);
  const reservation = result.data?.reservation;
  if (!reservation) {
    throw new Error(result.message ?? 'Reservation response is missing data');
  }
  return reservation;
}

/** DELETE /reservations/:id — customer soft-cancel PENDING reservation. */
export async function cancelReservation(reservationId: string): Promise<Reservation | null> {
  const response = await authenticatedFetch(`/reservations/${encodeURIComponent(reservationId)}`, {
    method: 'DELETE',
  });
  const result = await parseReservationResponse<{ cancelledReservation?: Reservation }>(response);
  return result.data?.cancelledReservation ?? null;
}

export function buildExpectedArrival(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

export function canCancelReservation(reservation: Reservation): boolean {
  if (reservation.status?.toUpperCase() !== 'PENDING') {
    return false;
  }
  if (!reservation.expectedArrival) {
    return true;
  }
  const expectedArrival = new Date(reservation.expectedArrival).getTime();
  if (Number.isNaN(expectedArrival)) {
    return true;
  }
  // BE rule: cannot cancel within 15 minutes of expected arrival.
  return expectedArrival > Date.now() + 15 * 60_000;
}
