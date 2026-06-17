import { authenticatedFetch } from '@/lib/auth-api';

import { getVehicleTypes, type VehicleType } from '@/features/customer/api/vehicles';

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
    throw new Error(payload?.message ?? 'Request failed');
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
    throw new Error(result.message ?? 'Vehicle response is missing data');
  }
  return vehicle;
}

export function resolveVehicleTypeLabel(
  vehicleTypeId?: { type?: string } | string | null,
): string {
  if (!vehicleTypeId) {
    return '—';
  }
  if (typeof vehicleTypeId === 'string') {
    return vehicleTypeId;
  }
  return vehicleTypeId.type ?? '—';
}
