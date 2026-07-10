import { authenticatedFetch } from "@/lib/auth-api";

export type ParkingSlotApiStatus = "AVAILABLE" | "RESERVED" | "UNAVAILABLE" | "CURRENTLY-IN-USED";

export type ParkingSlotStatus = ParkingSlotApiStatus | string;

export type ParkingVehicleType = "SEDAN" | "SUV" | "MPV" | "PICKUP";

export type ParkingSlot = {
  _id: string;
  floorId: string;
  slotNumber: string;
  status: ParkingSlotStatus | string;
};

export type ParkingFloor = {
  _id: string;
  floorName: string;
  totalSlot: number;
  vehicleType?: {
    _id: string;
    type: string;
  };
  slotStats?: {
    available: number;
    reserved?: number;
    unavailable: number;
    inUsed: number;
    total: number;
  };
  slots: ParkingSlot[];
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

async function parseParkingResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    throw new Error(payload?.message ?? "Request failed");
  }
  return payload ?? {};
}

export type ParkingSlotFilters = {
  vehicleType?: ParkingVehicleType;
  floorId?: string;
  status?: ParkingSlotApiStatus;
};

export type CustomerParkingSession = {
  _id: string;
  vehicleId: string | { _id: string; licensePlate?: string };
  parkingSlotId:
    | string
    | {
        _id: string;
        slotNumber?: string;
        floorId?: { floorName?: string };
      };
  checkInUserId?: string | { _id?: string; fullName?: string; phone?: string };
  checkInTime?: string;
  status: string;
};

/** GET /parking/active-user-parking-session/:vehicleId — phiên gửi xe đang hoạt động của xe. */
export async function getActiveUserParkingSession(
  vehicleId: string,
): Promise<CustomerParkingSession | null> {
  try {
    const response = await authenticatedFetch(`/parking/active-user-parking-session/${vehicleId}`);
    const payload = await parseParkingResponse<{ parkingSession?: CustomerParkingSession }>(
      response,
    );
    return payload.data?.parkingSession ?? null;
  } catch {
    return null;
  }
}

export async function getParkingSlots(filters: ParkingSlotFilters = {}): Promise<ParkingFloor[]> {
  const params = new URLSearchParams();
  if (filters.vehicleType) {
    params.set("vehicleType", filters.vehicleType);
  }
  if (filters.floorId) {
    params.set("floorId", filters.floorId);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();
  const response = await authenticatedFetch(`/parking/slots${query ? `?${query}` : ""}`);
  const payload = await parseParkingResponse<{ floors?: ParkingFloor[] }>(response);
  return payload.data?.floors ?? [];
}
