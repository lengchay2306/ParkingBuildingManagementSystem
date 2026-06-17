import { authenticatedFetch } from '@/lib/auth-api';

import {
  getParkingSlots,
  type ParkingFloor,
  type ParkingSlot,
  type ParkingSlotFilters,
  type ParkingSlotStatus,
} from '@/features/customer/api/parking';

export type {
  ParkingFloor,
  ParkingSlot,
  ParkingSlotFilters,
  ParkingSlotStatus,
};

export { getParkingSlots };

export type ParkingSession = {
  _id: string;
  vehicleId: string | { _id: string; licensePlate?: string };
  parkingSlotId: string | { _id: string; slotNumber?: string };
  sessionType: 'DAILY' | 'MONTH';
  checkInUserId: string;
  checkInStaffId: string;
  checkInTime: string;
  status: 'ACTIVE' | 'COMPLETED';
};

export type CreateParkingSessionPayload = {
  phone: string;
  licensePlate: string;
  parkingSlotId: string;
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

async function parseParkingApiResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    throw new Error(payload?.message ?? 'Request failed');
  }
  return payload ?? {};
}

function normalizePlate(plate: string) {
  return plate.trim().toUpperCase();
}

/** POST /parking/create-parking-session — Staff check-in. */
export async function createParkingSession(
  payload: CreateParkingSessionPayload,
): Promise<ParkingSession> {
  const response = await authenticatedFetch('/parking/create-parking-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: payload.phone.trim(),
      licensePlate: normalizePlate(payload.licensePlate),
      parkingSlotId: payload.parkingSlotId,
    }),
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
