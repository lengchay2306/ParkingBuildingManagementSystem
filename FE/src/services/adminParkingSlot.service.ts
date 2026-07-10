import { authFetch } from "@/lib/auth-fetch";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type ApiPayload<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class AdminParkingSlotApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminParkingSlotApiError";
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

export type AdminParkingSlotStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "UNAVAILABLE"
  | "CURRENTLY-IN-USED";

export type AdminParkingSlot = {
  _id: string;
  floorId?: string | { _id?: string; floorName?: string };
  slotNumber: string;
  status: AdminParkingSlotStatus;
};

export type AdminParkingSlotPagination = {
  page?: number;
  limit?: number;
  totalCount?: number;
  totalPages?: number;
  [key: string]: unknown;
};

export type GetAdminParkingSlotsParams = {
  page?: number;
  limit?: number;
  floorId?: string;
  status?: AdminParkingSlotStatus;
};

export type CreateAdminParkingSlotRequest = {
  floorId: string;
  slotNumber: string;
  status: AdminParkingSlotStatus;
};

export type UpdateAdminParkingSlotRequest = Partial<CreateAdminParkingSlotRequest>;

/** GET /api/v1/parking-slots — ADMIN */
export const getAdminParkingSlots = async ({
  page = 1,
  limit = 50,
  floorId,
  status,
}: GetAdminParkingSlotsParams = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (floorId) params.set("floorId", floorId);
  if (status) params.set("status", status);

  const response = await authFetch(`${API_BASE}/api/v1/parking-slots?${params}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{
    parkingSlots?: AdminParkingSlot[];
    pagination?: AdminParkingSlotPagination;
  }>(response);

  if (!response.ok) {
    throw new AdminParkingSlotApiError(
      response.status,
      payload.message || "Không tải được danh sách chỗ đỗ.",
    );
  }

  return {
    parkingSlots: payload.data?.parkingSlots ?? [],
    pagination: payload.data?.pagination,
  };
};

/** GET /api/v1/parking-slots/:parkingSlotId — ADMIN */
export const getAdminParkingSlotById = async (parkingSlotId: string) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/parking-slots/${encodeURIComponent(parkingSlotId)}`,
    { method: "GET", credentials: "include" },
  );
  const payload = await parseJson<{ parkingSlot?: AdminParkingSlot }>(response);

  if (!response.ok) {
    throw new AdminParkingSlotApiError(
      response.status,
      payload.message || "Không tìm thấy chỗ đỗ.",
    );
  }

  if (!payload.data?.parkingSlot) {
    throw new AdminParkingSlotApiError(response.status, "Phản hồi thiếu dữ liệu chỗ đỗ.");
  }

  return payload.data.parkingSlot;
};

/** POST /api/v1/parking-slots — ADMIN */
export const createAdminParkingSlot = async (body: CreateAdminParkingSlotRequest) => {
  const response = await authFetch(`${API_BASE}/api/v1/parking-slots`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const payload = await parseJson<{ parkingSlot?: AdminParkingSlot }>(response);

  if (response.status !== 201) {
    throw new AdminParkingSlotApiError(
      response.status,
      payload.message || "Không tạo được chỗ đỗ.",
    );
  }

  if (!payload.data?.parkingSlot) {
    throw new AdminParkingSlotApiError(response.status, "Phản hồi tạo chỗ đỗ thiếu dữ liệu.");
  }

  return payload.data.parkingSlot;
};

/** PUT /api/v1/parking-slots/:parkingSlotId — ADMIN */
export const updateAdminParkingSlot = async (
  parkingSlotId: string,
  body: UpdateAdminParkingSlotRequest,
) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/parking-slots/${encodeURIComponent(parkingSlotId)}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    },
  );
  const payload = await parseJson<{ parkingSlot?: AdminParkingSlot }>(response);

  if (!response.ok) {
    throw new AdminParkingSlotApiError(
      response.status,
      payload.message || "Không cập nhật được chỗ đỗ.",
    );
  }

  if (!payload.data?.parkingSlot) {
    throw new AdminParkingSlotApiError(response.status, "Phản hồi cập nhật chỗ đỗ thiếu dữ liệu.");
  }

  return payload.data.parkingSlot;
};

/** DELETE /api/v1/parking-slots/:parkingSlotId — ADMIN */
export const deleteAdminParkingSlot = async (parkingSlotId: string) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/parking-slots/${encodeURIComponent(parkingSlotId)}`,
    { method: "DELETE", credentials: "include" },
  );
  const payload = await parseJson<{ parkingSlot?: AdminParkingSlot }>(response);

  if (!response.ok) {
    throw new AdminParkingSlotApiError(
      response.status,
      payload.message || "Không xóa được chỗ đỗ.",
    );
  }

  return payload.data?.parkingSlot ?? null;
};
