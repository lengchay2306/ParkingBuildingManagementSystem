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
      return "Unable to load profile.";
  }
};

export const getMyProfile = async () => {
  const response = await fetch(`${API_BASE}/api/v1/users/my-profile`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{ user?: UserProfile }>(response);

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
  const response = await fetch(`${API_BASE}/api/v1/users/my-profile`, {
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

export type UpdateUserByIdRequest = {
  fullName?: string;
  phone?: string;
  status?: "ACTIVE" | "LOCKED";
  roleId?: string;
};

export const updateUserById = async (userId: string, payload: UpdateUserByIdRequest) => {
  const response = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
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

  const response = await fetch(`${API_BASE}/api/v1/users?${params.toString()}`, {
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
