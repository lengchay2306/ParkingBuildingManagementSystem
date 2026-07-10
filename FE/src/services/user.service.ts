import { authFetch } from "@/lib/auth-fetch";
import type { Vehicle } from "@/services/vehicle.service";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type UserRole = {
  _id: string;
  roleName: string;
};

export type UserProfile = {
  _id: string;
  email: string;
  fullName: string;
  phone: string;
  roleId: string | UserRole;
  status: string;
  vehicles?: Vehicle[];
  createdAt?: string;
  updatedAt?: string;
};

export type UsersPagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

export type GetAllUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "LOCKED";
  roleId?: string;
  sortBy?: "createdAt" | "fullName" | "email";
  sortOrder?: "asc" | "desc";
};

type ApiPayload<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class UserApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UserApiError";
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

const userErrorMessage = (status: number) => {
  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to view users.";
    case 404:
      return "User not found.";
    default:
      return "Không thể tải hồ sơ.";
  }
};

export const getMyProfile = async () => {
  const response = await authFetch(`${API_BASE}/api/v1/users/my-profile`, {
    method: "GET",
    credentials: "include", //gửi cookie session, không cần thủ công
  });
  const payload = await parseJson<{ user?: UserProfile }>(response); 
      //đọc dữ liệu thô từ ứng api và đổi thành object js
  if (!response.ok) {
    throw new UserApiError(response.status, payload.message || userErrorMessage(response.status));
  }

  const user = payload.data?.user;
  if (!user) {
    throw new UserApiError(response.status, "Profile response data is missing.");
  }

  return user;
};

export type UpdateMyProfileRequest = {
  fullName?: string;
  phone?: string;
};

export const updateMyProfile = async (payload: UpdateMyProfileRequest) => {
  const response = await authFetch(`${API_BASE}/api/v1/users/my-profile`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = await parseJson<{ user?: UserProfile }>(response);

  if (!response.ok) {
    const fallback =
      response.status === 400
        ? "Invalid data or no fields provided."
        : userErrorMessage(response.status);
    throw new UserApiError(response.status, result.message || fallback);
  }

  const user = result.data?.user;
  if (!user) {
    throw new UserApiError(response.status, "Update response data is missing.");
  }

  return user;
};

export type ChangePasswordRequest = {
  oldPassword: string;
  newPassword: string;
};

export const changePassword = async (payload: ChangePasswordRequest) => {
  const response = await authFetch(`${API_BASE}/api/v1/users/my-profile/change-password`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = await parseJson<{ user?: UserProfile }>(response);

  if (!response.ok) {
    const message = result.message ?? "";
    const translatedMessage = message.toLowerCase().includes("old password")
      ? "Mật khẩu hiện tại không đúng."
      : message;
    const fallback =
      response.status === 400
        ? "Mật khẩu cũ không đúng hoặc dữ liệu không hợp lệ."
        : userErrorMessage(response.status);
    throw new UserApiError(response.status, translatedMessage || fallback);
  }

  const user = result.data?.user;
  if (!user) {
    throw new UserApiError(response.status, "Change password response data is missing.");
  }

  return user;
};

export type UpdateUserByIdRequest = {
  email?: string;
  fullName?: string;
  phone?: string;
  status?: "ACTIVE" | "LOCKED";
};

export type CreateUserVehicleItem = {
  licensePlate: string;
  vehicleTypeId: string;
  monthlyCardId?: string | null;
  status?: "ACTIVE" | "INACTIVE";
};

export type CreateUserRequest = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  roleId: string;
  status?: "ACTIVE" | "LOCKED";
  vehicles?: CreateUserVehicleItem[];
};

export const createUser = async (payload: CreateUserRequest) => {
  const response = await authFetch(`${API_BASE}/api/v1/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = await parseJson<{ user?: UserProfile }>(response);

  if (response.status !== 201) {
    const fallback =
      response.status === 400
        ? "Dữ liệu không hợp lệ."
        : response.status === 409
          ? "Email hoặc số điện thoại đã được sử dụng."
          : userErrorMessage(response.status);
    throw new UserApiError(response.status, result.message || fallback);
  }

  const user = result.data?.user;
  if (!user) {
    throw new UserApiError(response.status, "Create response data is missing.");
  }

  return user;
};

export const updateUserById = async (userId: string, payload: UpdateUserByIdRequest) => {
  const response = await authFetch(`${API_BASE}/api/v1/users/${userId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = await parseJson<{ user?: UserProfile }>(response);

  if (!response.ok) {
    const fallback =
      response.status === 400
        ? "Invalid data or no fields provided."
        : userErrorMessage(response.status);
    throw new UserApiError(response.status, result.message || fallback);
  }

  const user = result.data?.user;
  if (!user) {
    throw new UserApiError(response.status, "Update response data is missing.");
  }

  return user;
};

export const getAllUsers = async ({
  page = 1,
  limit = 100,
  search,
  status,
  roleId,
  sortBy = "createdAt",
  sortOrder = "desc",
}: GetAllUsersParams = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });

  if (search?.trim()) {
    params.set("search", search.trim());
  }
  if (status) {
    params.set("status", status);
  }
  if (roleId) {
    params.set("roleId", roleId);
  }

  const response = await authFetch(`${API_BASE}/api/v1/users?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{
    users?: UserProfile[];
    pagination?: UsersPagination;
  }>(response);

  if (!response.ok) {
    throw new UserApiError(response.status, payload.message || userErrorMessage(response.status));
  }

  return {
    users: payload.data?.users ?? [],
    pagination:
      payload.data?.pagination ??
      ({
        page,
        limit,
        totalCount: payload.data?.users?.length ?? 0,
        totalPages: 1,
      } satisfies UsersPagination),
  };
};

export const deleteUserById = async (userId: string) => {
  const response = await authFetch(`${API_BASE}/api/v1/users/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const result = await parseJson<{ user?: UserProfile }>(response);

  if (!response.ok) {
    const fallback =
      response.status === 403
        ? "Bạn không có quyền xóa người dùng."
        : userErrorMessage(response.status);
    throw new UserApiError(response.status, result.message || fallback);
  }

  const user = result.data?.user;
  if (!user) {
    throw new UserApiError(response.status, "Delete response data is missing.");
  }

  return user;
};

/** GET /api/v1/users/:userId — ADMIN | MANAGER | STAFF */
export const getUserById = async (userId: string) => {
  const response = await authFetch(`${API_BASE}/api/v1/users/${encodeURIComponent(userId)}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{ user?: UserProfile }>(response);

  if (!response.ok) {
    throw new UserApiError(response.status, payload.message || userErrorMessage(response.status));
  }

  const user = payload.data?.user;
  if (!user) {
    throw new UserApiError(response.status, "User response data is missing.");
  }

  return user;
};
