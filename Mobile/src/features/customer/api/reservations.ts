import { authenticatedFetch } from '@/lib/auth-api';

export type ReservationStatus = 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';

export type Reservation = {
  _id: string;
  driverId: string;
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

export async function getMyReservations(status?: ReservationStatus): Promise<Reservation[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await authenticatedFetch(`/reservations/my${query}`);
  const payload = await parseReservationResponse<{ reservations?: Reservation[] }>(response);
  return payload.data?.reservations ?? [];
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

export function buildExpectedArrival(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}
