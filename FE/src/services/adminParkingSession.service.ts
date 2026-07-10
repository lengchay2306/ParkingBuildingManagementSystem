import { authFetch } from "@/lib/auth-fetch";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type ApiPayload<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class AdminParkingSessionApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminParkingSessionApiError";
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

export type AdminParkingSession = {
  _id: string;
  vehicleId?: string | null | { _id?: string; licensePlate?: string };
  phone?: string | null;
  licensePlate?: string | null;
  parkingSlotId: string | { _id?: string; slotNumber?: string };
  sessionType: "DAILY" | "MONTH";
  checkInStaffId?: string | { _id?: string };
  checkOutStaffId?: string | null | { _id?: string };
  checkInTime?: string;
  checkOutTime?: string | null;
  status: "ACTIVE" | "COMPLETED";
  isGuest?: boolean;
};

export type AdminParkingSessionPagination = {
  page?: number;
  limit?: number;
  totalCount?: number;
  totalPages?: number;
  [key: string]: unknown;
};

export type GetAdminParkingSessionsParams = {
  page?: number;
  limit?: number;
  status?: "ACTIVE" | "COMPLETED";
  vehicleId?: string;
  parkingSlotId?: string;
};

export type CreateAdminParkingSessionRequest = {
  vehicleId?: string | null;
  phone?: string | null;
  licensePlate?: string | null;
  parkingSlotId: string;
  sessionType: "DAILY" | "MONTH";
  checkInUserId?: string | null;
  checkOutUserId?: string | null;
  checkInStaffId: string;
  checkOutStaffId?: string | null;
  deleteStaffId?: string | null;
  checkInTime?: string;
  checkOutTime?: string | null;
  status: "ACTIVE" | "COMPLETED";
  isGuest?: boolean;
};

export type UpdateAdminParkingSessionRequest = Partial<CreateAdminParkingSessionRequest>;

/** GET /api/v1/parking-sessions — ADMIN */
export const getAdminParkingSessions = async ({
  page = 1,
  limit = 50,
  status,
  vehicleId,
  parkingSlotId,
}: GetAdminParkingSessionsParams = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  if (vehicleId) params.set("vehicleId", vehicleId);
  if (parkingSlotId) params.set("parkingSlotId", parkingSlotId);

  const response = await authFetch(`${API_BASE}/api/v1/parking-sessions?${params}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{
    parkingSessions?: AdminParkingSession[];
    pagination?: AdminParkingSessionPagination;
  }>(response);

  if (!response.ok) {
    throw new AdminParkingSessionApiError(
      response.status,
      payload.message || "Không tải được phiên đỗ xe (admin).",
    );
  }

  return {
    parkingSessions: payload.data?.parkingSessions ?? [],
    pagination: payload.data?.pagination,
  };
};

/** GET /api/v1/parking-sessions/:parkingSessionId — ADMIN */
export const getAdminParkingSessionById = async (parkingSessionId: string) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/parking-sessions/${encodeURIComponent(parkingSessionId)}`,
    { method: "GET", credentials: "include" },
  );
  const payload = await parseJson<{ parkingSession?: AdminParkingSession }>(response);

  if (!response.ok) {
    throw new AdminParkingSessionApiError(
      response.status,
      payload.message || "Không tìm thấy phiên đỗ xe.",
    );
  }

  if (!payload.data?.parkingSession) {
    throw new AdminParkingSessionApiError(response.status, "Phản hồi thiếu dữ liệu phiên.");
  }

  return payload.data.parkingSession;
};

/** POST /api/v1/parking-sessions — ADMIN */
export const createAdminParkingSession = async (body: CreateAdminParkingSessionRequest) => {
  const response = await authFetch(`${API_BASE}/api/v1/parking-sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const payload = await parseJson<{ parkingSession?: AdminParkingSession }>(response);

  if (response.status !== 201) {
    throw new AdminParkingSessionApiError(
      response.status,
      payload.message || "Không tạo được phiên đỗ xe.",
    );
  }

  if (!payload.data?.parkingSession) {
    throw new AdminParkingSessionApiError(response.status, "Phản hồi tạo phiên thiếu dữ liệu.");
  }

  return payload.data.parkingSession;
};

/** PUT /api/v1/parking-sessions/:parkingSessionId — ADMIN */
export const updateAdminParkingSession = async (
  parkingSessionId: string,
  body: UpdateAdminParkingSessionRequest,
) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/parking-sessions/${encodeURIComponent(parkingSessionId)}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    },
  );
  const payload = await parseJson<{ parkingSession?: AdminParkingSession }>(response);

  if (!response.ok) {
    throw new AdminParkingSessionApiError(
      response.status,
      payload.message || "Không cập nhật được phiên đỗ xe.",
    );
  }

  if (!payload.data?.parkingSession) {
    throw new AdminParkingSessionApiError(response.status, "Phản hồi cập nhật phiên thiếu dữ liệu.");
  }

  return payload.data.parkingSession;
};

/** DELETE /api/v1/parking-sessions/:parkingSessionId — ADMIN */
export const deleteAdminParkingSession = async (parkingSessionId: string) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/parking-sessions/${encodeURIComponent(parkingSessionId)}`,
    { method: "DELETE", credentials: "include" },
  );
  const payload = await parseJson<{ parkingSession?: AdminParkingSession }>(response);

  if (!response.ok) {
    throw new AdminParkingSessionApiError(
      response.status,
      payload.message || "Không xóa được phiên đỗ xe.",
    );
  }

  return payload.data?.parkingSession ?? null;
};
