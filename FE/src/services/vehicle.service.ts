const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type VehicleType = {
  _id: string;
  type: string;
};

export type Vehicle = {
  _id: string;
  id?: string;
  userId: string;
  licensePlate: string;
  vehicleTypeId: string | VehicleType;
  monthlyCardId: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateVehicleRequest = {
  licensePlate: string;
  vehicleTypeId: string;
};

type ApiPayload<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class VehicleApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "VehicleApiError";
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

const vehicleErrorMessage = (status: number) => {
  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "Only customer accounts can register vehicles.";
    case 404:
      return "Vehicle type not found.";
    case 409:
      return "Vehicle with this license plate already exists.";
    default:
      return "Unable to complete vehicle request.";
  }
};

export const getVehicleTypes = async () => {
  const response = await fetch(`${API_BASE}/api/v1/vehicles/types`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{ vehicleTypes?: VehicleType[] }>(response);

  if (!response.ok) {
    throw new VehicleApiError(
      response.status,
      payload.message || vehicleErrorMessage(response.status),
    );
  }

  return payload.data?.vehicleTypes ?? [];
};

export const getMyVehicles = async () => {
  const response = await fetch(`${API_BASE}/api/v1/vehicles/my`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{ vehicles?: Vehicle[] }>(response);

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new VehicleApiError(
      response.status,
      payload.message || vehicleErrorMessage(response.status),
    );
  }

  return payload.data?.vehicles ?? [];
};

export const getVehicleByLicensePlate = async (licensePlate: string) => {
  const normalizedPlate = licensePlate.trim().toUpperCase();
  const response = await fetch(
    `${API_BASE}/api/v1/vehicles/${encodeURIComponent(normalizedPlate)}`,
    {
      method: "GET",
      credentials: "include",
    },
  );
  const payload = await parseJson<{ vehicle?: Vehicle }>(response);

  if (!response.ok) {
    throw new VehicleApiError(
      response.status,
      payload.message || vehicleErrorMessage(response.status),
    );
  }

  const vehicle = payload.data?.vehicle;
  if (!vehicle) {
    throw new VehicleApiError(response.status, "Vehicle response data is missing.");
  }

  return vehicle;
};

export const createVehicle = async (request: CreateVehicleRequest) => {
  const response = await fetch(`${API_BASE}/api/v1/vehicles`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(request),
  });
  const payload = await parseJson<{ vehicle?: Vehicle }>(response);

  if (response.status !== 201) {
    throw new VehicleApiError(
      response.status,
      payload.message || vehicleErrorMessage(response.status),
    );
  }

  const vehicle = payload.data?.vehicle;
  if (!vehicle) {
    throw new VehicleApiError(response.status, "Vehicle created, but response data is missing.");
  }

  return vehicle;
};
