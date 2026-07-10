import { authenticatedFetch } from "@/lib/auth-api";

import { getVehicleTypes, type VehicleType } from "@/features/customer/api/vehicles";

export type { VehicleType };

export { getVehicleTypes };

export type StaffVehicle = {
  _id: string;
  userId: string | { _id: string; fullName?: string; phone?: string };
  licensePlate: string;
  vehicleTypeId: string | { _id: string; type?: string };
  monthlyCardId: string | { _id: string; cardCode?: string } | null;
  status?: string;
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

async function parseVehicleApiResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    throw new Error(payload?.message ?? "Request failed");
  }
  return payload ?? {};
}

function normalizePlate(plate: string) {
  return plate.trim().toUpperCase();
}

/** GET /vehicles/:licensePlate — lookup vehicle for staff patrol. */
export async function getVehicleByLicensePlate(licensePlate: string): Promise<StaffVehicle> {
  const normalized = normalizePlate(licensePlate);
  const response = await authenticatedFetch(`/vehicles/${encodeURIComponent(normalized)}`);
  const result = await parseVehicleApiResponse<{ vehicle?: StaffVehicle }>(response);
  const vehicle = result.data?.vehicle;
  if (!vehicle) {
    throw new Error(result.message ?? "Vehicle response is missing data");
  }
  return vehicle;
}

export function resolveVehicleTypeLabel(vehicleTypeId?: { type?: string } | string | null): string {
  if (!vehicleTypeId) {
    return "—";
  }
  if (typeof vehicleTypeId === "string") {
    return vehicleTypeId;
  }
  return vehicleTypeId.type ?? "—";
}

type PopulatedOwner = {
  _id?: string;
  fullName?: string;
  phone?: string;
};

export type VehicleOwnerProfile = {
  fullName?: string;
  phone?: string;
};

/**
 * Owner info from staff APIs:
 * - GET /vehicles/:plate → userId { fullName, phone } when populated by BE
 * - GET /parking/active-user-parking-session/:vehicleId → checkInUserId { fullName, phone }
 */
export function resolveVehicleOwnerProfile(
  vehicle: StaffVehicle,
  activeSession?: { checkInUserId?: string | PopulatedOwner } | null,
): VehicleOwnerProfile | null {
  const sessionUser = activeSession?.checkInUserId;
  if (sessionUser && typeof sessionUser === "object") {
    const fullName = sessionUser.fullName?.trim();
    const phone = sessionUser.phone?.trim();
    if (fullName || phone) {
      return {
        fullName: fullName || undefined,
        phone: phone || undefined,
      };
    }
  }

  const owner = vehicle.userId;
  if (owner && typeof owner === "object") {
    const fullName = owner.fullName?.trim();
    const phone = owner.phone?.trim();
    if (fullName || phone) {
      return {
        fullName: fullName || undefined,
        phone: phone || undefined,
      };
    }
  }

  return null;
}

/** Owner phone when the active-session API returns checkInUserId.phone. */
export function resolveVehicleOwnerPhone(
  vehicle: StaffVehicle,
  activeSession?: { checkInUserId?: string | PopulatedOwner } | null,
): string {
  return resolveVehicleOwnerProfile(vehicle, activeSession)?.phone ?? "";
}
