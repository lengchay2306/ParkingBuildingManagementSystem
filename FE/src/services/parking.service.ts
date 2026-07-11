import { authFetch } from "@/lib/auth-fetch";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type ParkingSlotStatus = "AVAILABLE" | "RESERVED" | "UNAVAILABLE" | "CURRENTLY-IN-USED";

export type ParkingSlot = {
  _id: string;
  slotNumber: string;
  status: ParkingSlotStatus;
};

export type FloorSlotStats = {
  available: number;
  reserved?: number;
  unavailable: number;
  inUsed: number;
  total: number;
};

export type ParkingFloor = {
  _id: string;
  floorName: string;
  totalSlot?: number;
  slotStats?: FloorSlotStats;
  slots: ParkingSlot[];
  vehicleType?: {
    _id: string;
    type: string;
  };
};

type ApiPayload<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class ParkingApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ParkingApiError";
    this.status = status;
  }
}

const parseJson = async <T>(response: Response): Promise<ApiPayload<T>> => {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return {};
  }
  return (await response.json()) as ApiPayload<T>;
};

const parkingErrorMessage = (status: number) => {
  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 404:
      return "Parking floor or vehicle type not found.";
    default:
      return "Không thể tải danh sách chỗ đỗ.";
  }
};

export type GetParkingFloorsParams = {
  vehicleType?: "SEDAN" | "SUV" | "MPV" | "PICKUP";
  floorId?: string;
  status?: ParkingSlotStatus;
};

export const getParkingFloors = async ({
  vehicleType,
  floorId,
  status,
}: GetParkingFloorsParams = {}) => {
  const params = new URLSearchParams();
  if (vehicleType) {
    params.set("vehicleType", vehicleType);
  }
  if (floorId) {
    params.set("floorId", floorId);
  }
  if (status) {
    params.set("status", status);
  }

  const query = params.toString();
  const response = await authFetch(
    `${API_BASE}/api/v1/parking/slots${query ? `?${query}` : ""}`,
    {
      method: "GET",
      credentials: "include",
    },
  );
  const payload = await parseJson<{ floors?: ParkingFloor[] }>(response);

  if (!response.ok) {
    throw new ParkingApiError(
      response.status,
      payload.message || parkingErrorMessage(response.status),
    );
  }

  return payload.data?.floors ?? [];
};

export type ParkingSessionUser = {
  _id: string;
  fullName?: string;
  email?: string;
  phone?: string;
};

export type ParkingSessionVehicle = {
  _id: string;
  licensePlate?: string;
  vehicleTypeId?: { _id?: string; type?: string };
};

export type ParkingSession = {
  _id: string;
  vehicleId?: string | ParkingSessionVehicle | null;
  parkingSlotId:
    | string
    | {
        _id: string;
        slotNumber?: string;
        status?: ParkingSlotStatus;
        floorId?: {
          floorName?: string;
          vehicleTypeId?: { _id?: string; type?: string };
        };
      };
  sessionType: "DAILY" | "MONTH" | string;
  checkInUserId?: string | ParkingSessionUser | null;
  checkOutUserId?: string | ParkingSessionUser | null;
  checkInStaffId?: string | ParkingSessionUser;
  checkInTime?: string;
  checkOutTime?: string | null;
  status: "ACTIVE" | "COMPLETED" | string;
  licensePlate?: string | null;
  phone?: string | null;
  isGuest?: boolean;
};

export type ParkingSessionsPagination = {
  currentPage: number;
  totalPage: number;
  totalItems: number;
  itemsPerPage: number;
};

export type GetParkingSessionsParams = {
  page?: number;
  limit?: number;
  status?: "ACTIVE" | "COMPLETED";
  date?: string;
};

export const getParkingSessions = async ({
  page = 1,
  limit = 100,
  status,
  date,
}: GetParkingSessionsParams = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) {
    params.set("status", status);
  }
  if (date) {
    params.set("date", date);
  }

  const response = await authFetch(`${API_BASE}/api/v1/parking/parking-sessions?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{
    parkingSessions?: {
      parkingSessions?: ParkingSession[];
      pagination?: ParkingSessionsPagination;
    };
  }>(response);

  if (!response.ok) {
    throw new ParkingApiError(
      response.status,
      payload.message || parkingErrorMessage(response.status),
    );
  }

  const nested = payload.data?.parkingSessions;
  return {
    parkingSessions: nested?.parkingSessions ?? [],
    pagination: nested?.pagination,
  };
};

export const getParkingSessionSlotId = (session: ParkingSession) => {
  if (typeof session.parkingSlotId === "string") {
    return session.parkingSlotId;
  }
  return session.parkingSlotId?._id ?? null;
};

export const getFloorForParkingSlotId = (
  slotId: string | null | undefined,
  floors: ParkingFloor[],
) => {
  if (!slotId) {
    return undefined;
  }
  return floors.find((floor) => floor.slots.some((slot) => slot._id === slotId));
};

export const getSessionVehicleTypeLabel = (
  session: ParkingSession,
  floors: ParkingFloor[] = [],
) => {
  const slot = session.parkingSlotId;
  if (typeof slot === "object" && slot.floorId?.vehicleTypeId?.type) {
    return slot.floorId.vehicleTypeId.type;
  }

  const floor = getFloorForParkingSlotId(getParkingSessionSlotId(session), floors);
  return floor?.vehicleType?.type;
};

export const getSessionLicensePlate = (
  session: ParkingSession,
  platesBySlotId: Record<string, string> = {},
) => {
  const direct = session.licensePlate?.trim();
  if (direct) {
    return direct;
  }

  const vehicle = session.vehicleId;
  if (vehicle && typeof vehicle === "object") {
    const fromVehicle = vehicle.licensePlate?.trim();
    if (fromVehicle) {
      return fromVehicle;
    }
  }

  const slotId = getParkingSessionSlotId(session);
  if (slotId) {
    const cached = platesBySlotId[slotId]?.trim();
    if (cached) {
      return cached;
    }
  }

  return undefined;
};

export const enrichParkingSessionsWithPlates = (
  sessions: ParkingSession[],
  platesBySlotId: Record<string, string>,
) =>
  sessions.map((session) => {
    const licensePlate = getSessionLicensePlate(session, platesBySlotId);
    if (!licensePlate || session.licensePlate === licensePlate) {
      return session;
    }
    return { ...session, licensePlate };
  });

/** Driver: active (or latest) parking session for one registered vehicle. */
export const getActiveUserParkingSession = async (
  vehicleId: string,
): Promise<ParkingSession | null> => {
  const response = await authFetch(
    `${API_BASE}/api/v1/parking/active-user-parking-session/${encodeURIComponent(vehicleId)}`,
    {
      method: "GET",
      credentials: "include",
    },
  );
  const payload = await parseJson<{ parkingSession?: ParkingSession }>(response);

  if (!response.ok) {
    if (response.status === 400) {
      return null;
    }
    throw new ParkingApiError(
      response.status,
      payload.message || parkingErrorMessage(response.status),
    );
  }

  return payload.data?.parkingSession ?? null;
};

/** Staff gate: active session for a license plate (404 → not in lot). */
export const getActiveSessionByPlate = async (
  licensePlate: string,
): Promise<ParkingSession | null> => {
  const normalized = licensePlate.trim().toUpperCase();
  const response = await authFetch(
    `${API_BASE}/api/v1/parking/active-session-by-plate/${encodeURIComponent(normalized)}`,
    {
      method: "GET",
      credentials: "include",
    },
  );
  const payload = await parseJson<{ parkingSession?: ParkingSession }>(response);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new ParkingApiError(
      response.status,
      payload.message || parkingErrorMessage(response.status),
    );
  }

  return payload.data?.parkingSession ?? null;
};

/** First AVAILABLE slot on a floor matching vehicle type (walk-in check-in). */
export const findFirstAvailableSlotForVehicleType = (
  floors: ParkingFloor[],
  vehicleTypeId: string,
): { slot: ParkingSlot; floor: ParkingFloor } | null => {
  for (const floor of floors) {
    const floorTypeId = floor.vehicleType?._id;
    if (!floorTypeId || floorTypeId !== vehicleTypeId) {
      continue;
    }

    const slot = floor.slots?.find((item) => item.status === "AVAILABLE");
    if (slot) {
      return { slot, floor };
    }
  }

  return null;
};

export const getParkingSessionsSafe = async (params: GetParkingSessionsParams = {}) => {
  try {
    return await getParkingSessions(params);
  } catch (error) {
    if (error instanceof ParkingApiError && error.status === 400) {
      return { parkingSessions: [], pagination: undefined };
    }
    throw error;
  }
};

/** Driver: load parking session per vehicle (404/400 → no session for that vehicle). */
export const fetchParkingSessionsForVehicleIds = async (vehicleIds: string[]) => {
  const uniqueIds = [...new Set(vehicleIds.filter(Boolean))];
  const map = new Map<string, ParkingSession>();

  if (uniqueIds.length === 0) {
    return map;
  }

  await Promise.all(
    uniqueIds.map(async (vehicleId) => {
      const session = await getActiveUserParkingSession(vehicleId);
      if (session) {
        map.set(vehicleId, session);
      }
    }),
  );

  return map;
};

/** BE always filters parking-sessions by check-in date; staff needs a rolling window. */
const STAFF_OCCUPANCY_LOOKBACK_DAYS = 14;

const formatLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const buildRecentLocalDateKeys = (days: number) => {
  const today = new Date();
  const keys: string[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);
    keys.push(formatLocalDateKey(day));
  }

  return keys;
};

/** Staff: ACTIVE + COMPLETED over recent days (BE requires an explicit check-in date). */
export const fetchStaffOccupancySessions = async () => {
  const dateKeys = buildRecentLocalDateKeys(STAFF_OCCUPANCY_LOOKBACK_DAYS);

  const results = await Promise.all(
    dateKeys.flatMap((date) => [
      getParkingSessionsSafe({ page: 1, limit: 300, status: "ACTIVE", date }),
      getParkingSessionsSafe({ page: 1, limit: 100, status: "COMPLETED", date }),
    ]),
  );

  const byId = new Map<string, ParkingSession>();
  for (const result of results) {
    for (const session of result.parkingSessions) {
      byId.set(session._id, session);
    }
  }

  return [...byId.values()];
};

/** Staff: load active parking sessions; returns empty list if API has no rows. */
export const fetchActiveParkingSessions = async () => {
  const result = await getParkingSessionsSafe({
    page: 1,
    limit: 200,
    status: "ACTIVE",
  });
  return result.parkingSessions;
};

export const mapParkingSessionsBySlotId = (sessions: ParkingSession[]) => {
  const bySlotId = new Map<string, ParkingSession>();

  for (const session of sessions) {
    const slotId = getParkingSessionSlotId(session);
    if (!slotId) {
      continue;
    }

    const existing = bySlotId.get(slotId);
    if (!existing) {
      bySlotId.set(slotId, session);
      continue;
    }

    if (session.status === "ACTIVE" && existing.status !== "ACTIVE") {
      bySlotId.set(slotId, session);
    }
  }

  return bySlotId;
};

export type ManageReservationDisplayStatus =
  | "PENDING"
  | "CLAIMED"
  | "EXPIRED"
  | "CANCELLED"
  | "CHECKED IN"
  | "CHECKED OUT"
  | string;

export const getReservationVehicleId = (reservation: {
  vehicleId: string | { _id: string };
}) => {
  if (typeof reservation.vehicleId === "object") {
    return reservation.vehicleId._id;
  }
  return reservation.vehicleId;
};

export const findSessionForReservation = (
  reservation: {
    vehicleId: string | { _id: string };
    parkingSlotId: string | { _id: string };
  },
  sessions: ParkingSession[],
  getSlotId: (reservation: { parkingSlotId: string | { _id: string } }) => string | null,
) => {
  const vehicleId = getReservationVehicleId(reservation);
  const reservationSlotId = getSlotId(reservation);

  for (const session of sessions) {
    const sessionSlotId = getParkingSessionSlotId(session);
    if (reservationSlotId && sessionSlotId !== reservationSlotId) {
      continue;
    }

    const sessionVehicleId =
      typeof session.vehicleId === "object" ? session.vehicleId?._id : session.vehicleId;
    if (vehicleId && sessionVehicleId && sessionVehicleId !== vehicleId) {
      continue;
    }

    return session;
  }

  return null;
};

export const getManageReservationDisplayStatus = (
  reservation: { status: string },
  parkingSession: ParkingSession | null,
): ManageReservationDisplayStatus => {
  if (parkingSession?.status === "COMPLETED" && parkingSession.checkOutTime) {
    return "CHECKED OUT";
  }

  if (parkingSession?.status === "ACTIVE") {
    return "CHECKED IN";
  }

  if (reservation.status === "CLAIMED") {
    return "CHECKED IN";
  }

  return reservation.status;
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

export const createParkingSession = async (payload: CreateParkingSessionPayload) => {
  const response = await authFetch(`${API_BASE}/api/v1/parking/create-parking-session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ reservationId: payload.reservationId }),
  });
  const body = await parseJson<{ parkingSession?: ParkingSession }>(response);

  if (response.status !== 201) {
    throw new ParkingApiError(
      response.status,
      body.message || parkingErrorMessage(response.status),
    );
  }

  const parkingSession = body.data?.parkingSession;
  if (!parkingSession) {
    throw new ParkingApiError(response.status, "Parking session response data is missing.");
  }

  return parkingSession;
};

/** Khách vãng lai — không cần SĐT / tài khoản driver (chỉ slot AVAILABLE). */
export const createGuestParkingSession = async (payload: CreateGuestParkingSessionPayload) => {
  const body: Record<string, string> = {
    licensePlate: payload.licensePlate.trim().toUpperCase(),
    parkingSlotId: payload.parkingSlotId,
    vehicleTypeId: payload.vehicleTypeId,
  };
  if (payload.phone?.trim()) {
    body.phone = payload.phone.trim();
  }

  const response = await authFetch(`${API_BASE}/api/v1/parking/create-parking-session/guest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const apiPayload = await parseJson<{ parkingSession?: ParkingSession }>(response);

  if (response.status !== 201) {
    throw new ParkingApiError(
      response.status,
      apiPayload.message || parkingErrorMessage(response.status),
    );
  }

  const parkingSession = apiPayload.data?.parkingSession;
  if (!parkingSession) {
    throw new ParkingApiError(response.status, "Parking session response data is missing.");
  }

  return parkingSession;
};

export type CheckoutParkingSessionPayload = {
  parkingSessionId: string;
  phone: string;
};

export const getCheckoutPhoneForSession = (session: ParkingSession) => {
  if (session.checkInUserId && typeof session.checkInUserId === "object") {
    return session.checkInUserId.phone?.trim() ?? "";
  }
  return session.phone?.trim() ?? "";
};

export const checkoutParkingSession = async (payload: CheckoutParkingSessionPayload) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/parking/checkout-parking-session/${encodeURIComponent(payload.parkingSessionId)}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ phone: payload.phone.trim() }),
    },
  );
  const apiPayload = await parseJson<{ parkingSession?: ParkingSession }>(response);

  if (response.status !== 201) {
    throw new ParkingApiError(
      response.status,
      apiPayload.message || parkingErrorMessage(response.status),
    );
  }

  const parkingSession = apiPayload.data?.parkingSession;
  if (!parkingSession) {
    throw new ParkingApiError(response.status, "Checkout response data is missing.");
  }

  return parkingSession;
};

export const mapActiveParkingSessionsBySlotId = (sessions: ParkingSession[]) => {
  const bySlotId = new Map<string, ParkingSession>();
  for (const session of sessions) {
    if (session.status !== "ACTIVE") {
      continue;
    }
    const slotId = getParkingSessionSlotId(session);
    if (!slotId || bySlotId.has(slotId)) {
      continue;
    }
    bySlotId.set(slotId, session);
  }
  return bySlotId;
};

/**
 * DELETE /api/v1/parking/delete-error-parking-session/:parkingSessionId
 * ADMIN | MANAGER — BE expects `{ userId }` (staff performing the delete) in body.
 */
export const deleteErrorParkingSession = async ({
  parkingSessionId,
  userId,
}: {
  parkingSessionId: string;
  userId: string;
}) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/parking/delete-error-parking-session/${encodeURIComponent(parkingSessionId)}`,
    {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId }),
    },
  );
  const apiPayload = await parseJson<{ updatedParkingSession?: ParkingSession }>(response);

  if (!response.ok) {
    throw new ParkingApiError(
      response.status,
      apiPayload.message || parkingErrorMessage(response.status),
    );
  }

  return apiPayload.data?.updatedParkingSession ?? null;
};
