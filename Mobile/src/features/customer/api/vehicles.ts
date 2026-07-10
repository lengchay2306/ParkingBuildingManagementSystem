import { authenticatedFetch } from "@/lib/auth-api";

export type VehicleType = {
  _id: string;
  type: string;
};

export type CreatedVehicle = {
  _id: string;
  userId: string;
  licensePlate: string;
  vehicleTypeId: string | VehicleType;
  monthlyCardId: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateVehiclePayload = {
  licensePlate: string;
  vehicleTypeId: string;
};

export type UpdateVehiclePayload = {
  licensePlate?: string;
  vehicleTypeId?: string;
};

const LICENSE_PLATE_PATTERN = /^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/;

function normalizePlate(plate: string) {
  return plate.trim().toUpperCase();
}

function validatePlate(plate: string, t: (vi: string, en: string) => string): string | null {
  const normalized = normalizePlate(plate);
  if (!normalized) {
    return t("Vui lòng nhập biển số", "Please enter a license plate");
  }
  if (!LICENSE_PLATE_PATTERN.test(normalized)) {
    return t("Biển số đúng dạng 51A-123.45", "Plate format: 51A-123.45");
  }
  return null;
}

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

export function validateVehicleRegistration(
  licensePlate: string,
  vehicleTypeId: string | null,
  t: (vi: string, en: string) => string,
): string | null {
  const plateError = validatePlate(licensePlate, t);
  if (plateError) {
    return plateError;
  }
  if (!vehicleTypeId) {
    return t("Vui lòng chọn loại xe", "Please select a vehicle type");
  }
  return null;
}

export function buildVehicleUpdatePayload(
  current: { licensePlate: string; vehicleTypeId: string },
  licensePlate: string,
  vehicleTypeId: string,
): UpdateVehiclePayload {
  const payload: UpdateVehiclePayload = {};
  const plate = normalizePlate(licensePlate);
  if (plate !== normalizePlate(current.licensePlate)) {
    payload.licensePlate = plate;
  }
  if (vehicleTypeId !== current.vehicleTypeId) {
    payload.vehicleTypeId = vehicleTypeId;
  }
  return payload;
}

export function validateVehicleUpdate(
  payload: UpdateVehiclePayload,
  licensePlate: string,
  vehicleTypeId: string | null,
  t: (vi: string, en: string) => string,
): string | null {
  if (!payload.licensePlate && !payload.vehicleTypeId) {
    return t("Chưa có thay đổi nào", "No changes to save");
  }
  if (payload.licensePlate !== undefined) {
    const plateError = validatePlate(licensePlate, t);
    if (plateError) {
      return plateError;
    }
  }
  if (payload.vehicleTypeId !== undefined && !vehicleTypeId) {
    return t("Vui lòng chọn loại xe", "Please select a vehicle type");
  }
  return null;
}

export function resolveVehicleTypeId(
  vehicleTypeId?: { _id?: string; type?: string } | string | null,
): string | null {
  if (!vehicleTypeId) {
    return null;
  }
  if (typeof vehicleTypeId === "string") {
    return vehicleTypeId;
  }
  return vehicleTypeId._id ?? null;
}

export async function getVehicleTypes(): Promise<VehicleType[]> {
  const response = await authenticatedFetch("/vehicles/types");
  const payload = await parseVehicleApiResponse<{ vehicleTypes?: VehicleType[] }>(response);
  return payload.data?.vehicleTypes ?? [];
}

export async function createVehicle(payload: CreateVehiclePayload): Promise<CreatedVehicle> {
  const response = await authenticatedFetch("/vehicles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      licensePlate: normalizePlate(payload.licensePlate),
      vehicleTypeId: payload.vehicleTypeId,
    }),
  });
  const result = await parseVehicleApiResponse<{ vehicle?: CreatedVehicle }>(response);
  const vehicle = result.data?.vehicle;
  if (!vehicle) {
    throw new Error(result.message ?? "Vehicle response is missing data");
  }
  return vehicle;
}

export async function updateVehicle(
  vehicleId: string,
  payload: UpdateVehiclePayload,
): Promise<CreatedVehicle> {
  const response = await authenticatedFetch(`/vehicles/user-vehicles/${vehicleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await parseVehicleApiResponse<{ vehicle?: CreatedVehicle }>(response);
  const vehicle = result.data?.vehicle;
  if (!vehicle) {
    throw new Error(result.message ?? "Vehicle response is missing data");
  }
  return vehicle;
}

export async function softDeleteVehicle(vehicleId: string): Promise<CreatedVehicle> {
  const response = await authenticatedFetch(`/vehicles/${vehicleId}/soft-delete`, {
    method: "DELETE",
  });
  const result = await parseVehicleApiResponse<{ vehicle?: CreatedVehicle }>(response);
  const vehicle = result.data?.vehicle;
  if (!vehicle) {
    throw new Error(result.message ?? "Vehicle response is missing data");
  }
  return vehicle;
}
