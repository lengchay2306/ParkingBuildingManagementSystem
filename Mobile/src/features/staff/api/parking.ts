import { authenticatedFetch } from "@/lib/auth-api";

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
} from "@/features/customer/api/parking";

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
  vehicleId: string | PopulatedVehicle;
  parkingSlotId: string | PopulatedSlot;
  sessionType: "DAILY" | "MONTH";
  checkInUserId: string | PopulatedUser;
  checkInStaffId: string | PopulatedUser;
  checkOutUserId?: string | PopulatedUser;
  checkOutStaffId?: string | PopulatedUser;
  checkInTime: string;
  checkOutTime?: string;
  status: "ACTIVE" | "COMPLETED";
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
  status?: "ACTIVE" | "COMPLETED";
  /** ISO date `YYYY-MM-DD` — defaults to today on backend when omitted. */
  date?: string;
};

export type CreateParkingSessionPayload = {
  phone: string;
  licensePlate: string;
  parkingSlotId: string;
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
    throw new Error(payload?.message ?? "Request failed");
  }
  return payload ?? {};
}

function isEmptySessionsError(response: Response, message: string): boolean {
  if (response.status !== 400) {
    return false;
  }
  const lower = message.toLowerCase();
  return lower.includes("no data") || lower.includes("cannot get all parking session");
}

function normalizePlate(plate: string) {
  return plate.trim().toUpperCase();
}

function buildSessionsQuery(params: ParkingSessionsQuery): string {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  if (params.status) {
    search.set("status", params.status);
  }
  if (params.date) {
    search.set("date", params.date);
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
  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<ParkingSessionsPayload> | null;
  const message = payload?.message ?? "Request failed";

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

/** PATCH /parking/checkout-parking-session/:id — Staff checkout. */
export async function checkoutParkingSession(
  payload: CheckoutParkingSessionPayload,
): Promise<ParkingSession> {
  const response = await authenticatedFetch(
    `/parking/checkout-parking-session/${encodeURIComponent(payload.parkingSessionId.trim())}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: payload.phone.trim() }),
    },
  );
  const result = await parseParkingApiResponse<{ parkingSession?: ParkingSession }>(response);
  const session = result.data?.parkingSession;
  if (!session) {
    throw new Error(result.message ?? "Checkout response is missing session data");
  }
  return session;
}

/** POST /parking/create-parking-session — Staff check-in. */
export async function createParkingSession(
  payload: CreateParkingSessionPayload,
): Promise<ParkingSession> {
  const response = await authenticatedFetch("/parking/create-parking-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: payload.phone.trim(),
      licensePlate: normalizePlate(payload.licensePlate),
      parkingSlotId: payload.parkingSlotId,
    }),
  });
  const result = await parseParkingApiResponse<{ parkingSession?: ParkingSession }>(response);
  const session = result.data?.parkingSession;
  if (!session) {
    throw new Error(result.message ?? "Parking session response is missing data");
  }
  return session;
}

export function collectAvailableSlots(
  floors: ParkingFloor[],
): Array<ParkingSlot & { floorName: string }> {
  return floors.flatMap((floor) =>
    floor.slots
      .filter((slot) => slot.status === "AVAILABLE")
      .map((slot) => ({
        ...slot,
        floorName: floor.floorName,
      })),
  );
}
