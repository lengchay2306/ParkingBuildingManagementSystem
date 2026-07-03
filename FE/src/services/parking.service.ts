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
      return "Unable to load parking slots.";
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
  const response = await fetch(
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
  vehicleId: string | ParkingSessionVehicle;
  parkingSlotId:
    | string
    | {
        _id: string;
        slotNumber?: string;
        status?: ParkingSlotStatus;
      };
  sessionType: "DAILY" | "MONTH" | string;
  checkInUserId: string | ParkingSessionUser;
  checkOutUserId?: string | ParkingSessionUser | null;
  checkInStaffId?: string | ParkingSessionUser;
  checkInTime?: string;
  checkOutTime?: string | null;
  status: "ACTIVE" | "COMPLETED" | string;
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

  const response = await fetch(`${API_BASE}/api/v1/parking/parking-sessions?${params.toString()}`, {
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

/** Load active parking sessions; returns empty list if API has no rows. */
export const fetchActiveParkingSessions = async () => {
  try {
    const result = await getParkingSessions({
      page: 1,
      limit: 200,
      status: "ACTIVE",
    });
    return result.parkingSessions;
  } catch (error) {
    if (error instanceof ParkingApiError && error.status === 400) {
      return [];
    }
    throw error;
  }
};

export type CreateParkingSessionPayload = {
  phone: string;
  licensePlate: string;
  parkingSlotId: string;
};

export const createParkingSession = async (payload: CreateParkingSessionPayload) => {
  const response = await fetch(`${API_BASE}/api/v1/parking/create-parking-session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
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
