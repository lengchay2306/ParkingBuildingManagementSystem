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
