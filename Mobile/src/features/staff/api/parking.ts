import { authenticatedFetch } from '@/lib/auth-api';

import {
  getActiveUserParkingSession,
  getParkingSlots,
  type CustomerParkingSession,
  type ParkingFloor,
  type ParkingSlot,
  type ParkingSlotFilters,
  type ParkingSlotApiStatus,
  type ParkingVehicleType,
  type ParkingSlotStatus,
} from '@/features/customer/api/parking';

export type {
  ParkingFloor,
  ParkingSlot,
  ParkingSlotFilters,
  ParkingSlotApiStatus,
  ParkingVehicleType,
  ParkingSlotStatus,
};

export type StaffActiveParkingSession = CustomerParkingSession;

export { getActiveUserParkingSession, getParkingSlots };

type PopulatedUser = {
  _id: string;
  fullName?: string;
  phone?: string;
};

type PopulatedVehicle = {
  _id: string;
  licensePlate?: string;
  vehicleTypeId?: string | { _id: string; type?: string };
};

type PopulatedSlot = {
  _id: string;
  slotNumber?: string;
  status?: string;
  floorId?: string | { _id: string; floorName?: string };
};

export type ParkingSession = {
  _id: string;
  vehicleId: string | PopulatedVehicle | null;
  parkingSlotId: string | PopulatedSlot;
  sessionType: 'DAILY' | 'MONTH';
  checkInUserId?: string | PopulatedUser | null;
  checkInStaffId?: string | PopulatedUser;
  checkOutUserId?: string | PopulatedUser;
  checkOutStaffId?: string | PopulatedUser;
  checkInTime: string;
  checkOutTime?: string;
  status: 'ACTIVE' | 'COMPLETED';
  licensePlate?: string;
  phone?: string;
  isGuest?: boolean;
};

export type ParkingSessionsPagination = {
  currentPage: number;
  totalPage: number;
  totalItems: number;
  itemsPerPage: number;
};

export type ParkingSessionsQuery = {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'COMPLETED';
  /** ISO date `YYYY-MM-DD` — defaults to today on backend when omitted. */
  date?: string;
};

export type CreateParkingSessionPayload = {
  reservationId: string;
};

export type CreateGuestParkingSessionPayload = {
  licensePlate: string;
  parkingSlotId: string;
  vehicleTypeId: string;
  phone?: string;
};

export type CheckoutParkingSessionPayload = {
  parkingSessionId: string;
  phone: string;
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

type ParkingSessionsPayload = {
  parkingSessions?: {
    parkingSessions?: ParkingSession[];
    pagination?: ParkingSessionsPagination;
  };
};

async function parseParkingApiResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    throw new Error(payload?.message ?? 'Request failed');
  }
  return payload ?? {};
}

function isEmptySessionsError(response: Response, message: string): boolean {
  if (response.status !== 400) {
    return false;
  }
  const lower = message.toLowerCase();
  return lower.includes('no data') || lower.includes('cannot get all parking session');
}

function normalizePlate(plate: string) {
  return plate.trim().toUpperCase();
}

function buildSessionsQuery(params: ParkingSessionsQuery): string {
  const search = new URLSearchParams();
  search.set('page', String(params.page ?? 1));
  search.set('limit', String(params.limit ?? 50));
  if (params.status) {
    search.set('status', params.status);
  }
  if (params.date) {
    search.set('date', params.date);
  }
  return search.toString();
}

/** GET /parking/parking-sessions — Staff session list (paginated, filtered by day). */
export async function getParkingSessions(params: ParkingSessionsQuery = {}): Promise<{
  sessions: ParkingSession[];
  pagination: ParkingSessionsPagination;
}> {
  const query = buildSessionsQuery(params);
  const response = await authenticatedFetch(`/parking/parking-sessions?${query}`);
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<ParkingSessionsPayload> | null;
  const message = payload?.message ?? 'Request failed';

  if (!response.ok) {
    if (isEmptySessionsError(response, message)) {
      return {
        sessions: [],
        pagination: {
          currentPage: params.page ?? 1,
          totalPage: 0,
          totalItems: 0,
          itemsPerPage: params.limit ?? 50,
        },
      };
    }
    throw new Error(message);
  }

  const bundle = payload?.data?.parkingSessions;
  return {
    sessions: bundle?.parkingSessions ?? [],
    pagination: bundle?.pagination ?? {
      currentPage: params.page ?? 1,
      totalPage: 0,
      totalItems: 0,
      itemsPerPage: params.limit ?? 50,
    },
  };
}

const STAFF_ACTIVE_SESSION_LOOKBACK_DAYS = 14;

function buildRecentLocalDateKeys(days: number): string[] {
  const keys: string[] = [];
  const today = new Date();

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);
    keys.push(
      `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
    );
  }

  return keys;
}

/**
 * BE filters parking-sessions by check-in date — active sessions from prior days
 * are omitted from today's query. Scan a rolling window when resolving by id.
 */
export async function findStaffActiveSessionById(sessionId: string): Promise<ParkingSession | null> {
  const sessions = await getStaffActiveParkingSessions();
  return (
    sessions.find(
      (session) => session._id === sessionId && session.status === 'ACTIVE' && !session.checkOutTime,
    ) ?? null
  );
}

/**
 * All currently ACTIVE sessions across a recent check-in date window.
 * Needed because BE `/parking/parking-sessions?date=` only returns one day.
 */
export async function getStaffActiveParkingSessions(): Promise<ParkingSession[]> {
  const dateKeys = buildRecentLocalDateKeys(STAFF_ACTIVE_SESSION_LOOKBACK_DAYS);
  const results = await Promise.all(
    dateKeys.map((date) =>
      getParkingSessions({ page: 1, limit: 300, status: 'ACTIVE', date }).catch(() => ({
        sessions: [] as ParkingSession[],
        pagination: {
          currentPage: 1,
          totalPage: 0,
          totalItems: 0,
          itemsPerPage: 300,
        },
      })),
    ),
  );

  const byId = new Map<string, ParkingSession>();
  for (const result of results) {
    for (const session of result.sessions) {
      if (session.status !== 'ACTIVE' || session.checkOutTime) {
        continue;
      }
      byId.set(session._id, session);
    }
  }

  return Array.from(byId.values());
}

/** GET /parking/active-session-by-plate/:plate — active session for checkout lookup. */
export async function getActiveSessionByPlate(licensePlate: string): Promise<ParkingSession | null> {
  const normalized = normalizePlate(licensePlate);
  const response = await authenticatedFetch(
    `/parking/active-session-by-plate/${encodeURIComponent(normalized)}`,
  );
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<{
    parkingSession?: ParkingSession;
  }> | null;

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(payload?.message ?? 'Request failed');
  }

  return payload?.data?.parkingSession ?? null;
}

/** First AVAILABLE slot on a floor matching vehicle type (walk-in check-in). */
export function findFirstAvailableSlotForVehicleType(
  floors: ParkingFloor[],
  vehicleTypeId: string,
): { slot: ParkingSlot; floor: ParkingFloor } | null {
  for (const floor of floors) {
    const floorTypeId =
      typeof floor.vehicleType === 'object' ? floor.vehicleType?._id : floor.vehicleType;
    if (!floorTypeId || floorTypeId !== vehicleTypeId) {
      continue;
    }

    const slot = floor.slots.find((item) => item.status === 'AVAILABLE');
    if (slot) {
      return { slot, floor };
    }
  }

  return null;
}

/** PATCH /parking/checkout-parking-session/:id — Monthly card checkout only. */
export async function checkoutParkingSession(
  payload: CheckoutParkingSessionPayload,
): Promise<ParkingSession> {
  const response = await authenticatedFetch(
    `/parking/checkout-parking-session/${encodeURIComponent(payload.parkingSessionId.trim())}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: payload.phone.trim() }),
    },
  );
  const result = await parseParkingApiResponse<{ parkingSession?: ParkingSession }>(response);
  const session = result.data?.parkingSession;
  if (!session) {
    throw new Error(result.message ?? 'Checkout response is missing session data');
  }
  return session;
}

/** POST /parking/create-parking-session — Reservation check-in. */
export async function createParkingSession(
  payload: CreateParkingSessionPayload,
): Promise<ParkingSession> {
  const response = await authenticatedFetch('/parking/create-parking-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservationId: payload.reservationId.trim() }),
  });
  const result = await parseParkingApiResponse<{ parkingSession?: ParkingSession }>(response);
  const session = result.data?.parkingSession;
  if (!session) {
    throw new Error(result.message ?? 'Parking session response is missing data');
  }
  return session;
}

/** POST /parking/create-parking-session/guest — Walk-in / guest check-in. */
export async function createGuestParkingSession(
  payload: CreateGuestParkingSessionPayload,
): Promise<ParkingSession> {
  const body: Record<string, string> = {
    licensePlate: normalizePlate(payload.licensePlate),
    parkingSlotId: payload.parkingSlotId,
    vehicleTypeId: payload.vehicleTypeId,
  };
  if (payload.phone?.trim()) {
    body.phone = payload.phone.trim();
  }

  const response = await authenticatedFetch('/parking/create-parking-session/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await parseParkingApiResponse<{ parkingSession?: ParkingSession }>(response);
  const session = result.data?.parkingSession;
  if (!session) {
    throw new Error(result.message ?? 'Parking session response is missing data');
  }
  return session;
}

export function collectAvailableSlots(floors: ParkingFloor[]): Array<ParkingSlot & { floorName: string }> {
  return floors.flatMap((floor) =>
    floor.slots
      .filter((slot) => slot.status === 'AVAILABLE')
      .map((slot) => ({
        ...slot,
        floorName: floor.floorName,
      })),
  );
}

export function resolveVehicleTypeIdFromSessionOrVehicle(
  vehicleTypeId?: string | { _id?: string } | null,
): string | null {
  if (!vehicleTypeId) {
    return null;
  }
  if (typeof vehicleTypeId === 'string') {
    return vehicleTypeId;
  }
  return vehicleTypeId._id ?? null;
}
