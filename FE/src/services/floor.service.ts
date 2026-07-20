import { authFetch } from "@/lib/auth-fetch";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type ApiPayload<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class FloorApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "FloorApiError";
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

export type Floor = {
  _id: string;
  floorName: string;
  vehicleTypeId?: string | { _id?: string; type?: string };
  totalSlot: number;
  createdAt?: string;
  updatedAt?: string;
};

export type FloorPagination = {
  page?: number;
  limit?: number;
  totalCount?: number;
  totalPages?: number;
  [key: string]: unknown;
};

export type GetFloorsParams = {
  page?: number;
  limit?: number;
  vehicleTypeId?: string;
};

export type CreateFloorRequest = {
  floorName: string;
  vehicleTypeId: string;
  totalSlot: number;
};

export type UpdateFloorRequest = Partial<CreateFloorRequest>;

/** GET /api/v1/floors — ADMIN */
export const getAllFloors = async ({
  page = 1,
  limit = 50,
  vehicleTypeId,
}: GetFloorsParams = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (vehicleTypeId) params.set("vehicleTypeId", vehicleTypeId);

  const response = await authFetch(`${API_BASE}/api/v1/floors?${params}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{ floors?: Floor[]; pagination?: FloorPagination }>(response);

  if (!response.ok) {
    throw new FloorApiError(response.status, payload.message || "Không tải được danh sách tầng.");
  }

  return {
    floors: payload.data?.floors ?? [],
    pagination: payload.data?.pagination,
  };
};

/** GET /api/v1/floors/:floorId — ADMIN */
export const getFloorById = async (floorId: string) => {
  const response = await authFetch(`${API_BASE}/api/v1/floors/${encodeURIComponent(floorId)}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{ floor?: Floor }>(response);

  if (!response.ok) {
    throw new FloorApiError(response.status, payload.message || "Không tìm thấy tầng.");
  }

  if (!payload.data?.floor) {
    throw new FloorApiError(response.status, "Phản hồi thiếu dữ liệu tầng.");
  }

  return payload.data.floor;
};

/** POST /api/v1/floors — ADMIN */
export const createFloor = async (body: CreateFloorRequest) => {
  const response = await authFetch(`${API_BASE}/api/v1/floors`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const payload = await parseJson<{ floor?: Floor }>(response);

  if (response.status !== 201) {
    throw new FloorApiError(response.status, payload.message || "Không tạo được tầng.");
  }

  if (!payload.data?.floor) {
    throw new FloorApiError(response.status, "Phản hồi tạo tầng thiếu dữ liệu.");
  }

  return payload.data.floor;
};

/** PUT /api/v1/floors/:floorId — ADMIN */
export const updateFloor = async (floorId: string, body: UpdateFloorRequest) => {
  const response = await authFetch(`${API_BASE}/api/v1/floors/${encodeURIComponent(floorId)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const payload = await parseJson<{ floor?: Floor }>(response);

  if (!response.ok) {
    throw new FloorApiError(response.status, payload.message || "Không cập nhật được tầng.");
  }

  if (!payload.data?.floor) {
    throw new FloorApiError(response.status, "Phản hồi cập nhật tầng thiếu dữ liệu.");
  }

  return payload.data.floor;
};

/** DELETE /api/v1/floors/:floorId — ADMIN */
export const deleteFloor = async (floorId: string) => {
  const response = await authFetch(`${API_BASE}/api/v1/floors/${encodeURIComponent(floorId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  const payload = await parseJson<{ floor?: Floor }>(response);

  if (!response.ok) {
    throw new FloorApiError(response.status, payload.message || "Không xóa được tầng.");
  }

  return payload.data?.floor ?? null;
};

/** Admin list: load every page for client-side search/filter. */
export const fetchAllFloorsPages = async ({
  vehicleTypeId,
  batchSize = 100,
}: Pick<GetFloorsParams, "vehicleTypeId"> & { batchSize?: number } = {}) => {
  const first = await getAllFloors({ page: 1, limit: batchSize, vehicleTypeId });
  const totalPages = Math.max(first.pagination?.totalPages ?? 1, 1);

  if (totalPages <= 1) {
    return first.floors;
  }

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getAllFloors({ page: index + 2, limit: batchSize, vehicleTypeId }),
    ),
  );

  return [...first.floors, ...rest.flatMap((result) => result.floors)];
};
