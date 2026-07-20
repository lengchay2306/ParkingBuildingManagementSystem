import { authenticatedFetch } from '@/lib/auth-api';
import { extractApiErrorMessage, parseApiEnvelope, type ApiEnvelope } from '@/lib/api-error';

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

async function parseReservationResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  return parseApiEnvelope<T>(response);
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
    body: JSON.stringify({
      vehicleId: payload.vehicleId,
      parkingSlotId: payload.parkingSlotId,
      expectedArrival: payload.expectedArrival,
    }),
  });
  const result = await parseReservationResponse<{ reservation?: Reservation }>(response);
  const reservation = result.data?.reservation;
  if (!reservation) {
    throw new Error(extractApiErrorMessage(result, 'Reservation response is missing data'));
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

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

/** Local YYYY-MM-DD for date inputs (matches FE). */
export function toLocalDateInputValue(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local HH:mm for time inputs (matches FE). */
export function toLocalTimeInputValue(ms: number = Date.now()): string {
  const date = new Date(ms);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function getDefaultExpectedArrivalDate(): string {
  return toLocalDateInputValue(new Date());
}

/** Default: now + 1 hour (same as FE). */
export function getDefaultExpectedArrivalTime(): string {
  return toLocalTimeInputValue(Date.now() + 60 * 60_000);
}

/** Parse local date+time strings into a Date (null if invalid). */
export function parseExpectedArrival(dateValue: string, timeValue: string): Date | null {
  const date = dateValue.trim();
  const time = timeValue.trim();
  if (!date || !time) {
    return null;
  }
  // Accept HH:mm or HH:mm:ss
  const normalizedTime = /^\d{1,2}:\d{2}$/.test(time) ? time : time;
  const parsed = new Date(`${date}T${normalizedTime}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isExpectedArrivalValid(dateValue: string, timeValue: string): boolean {
  const parsed = parseExpectedArrival(dateValue, timeValue);
  if (!parsed) {
    return false;
  }
  const now = Date.now();
  const twoHoursFromNow = now + 2 * 60 * 60 * 1000;
  const arrivalMs = parsed.getTime();
  return arrivalMs > now && arrivalMs <= twoHoursFromNow;
}

/** @deprecated Prefer parseExpectedArrival + toISOString for free-form booking. */
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
