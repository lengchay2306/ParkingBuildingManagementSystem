const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type ApiPayload<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class AdminPricePolicyApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminPricePolicyApiError";
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

export type AdminPricePolicy = {
  _id: string;
  vehicleTypeId?: string | { _id?: string; type?: string };
  policyName: string;
  fromHour: number;
  toHour: number;
  ratePerHour: number;
  monthlyRate?: number | null;
};

export type AdminPricePolicyPagination = {
  page?: number;
  limit?: number;
  totalCount?: number;
  totalPages?: number;
  [key: string]: unknown;
};

export type GetAdminPricePoliciesParams = {
  page?: number;
  limit?: number;
  vehicleTypeId?: string;
};

export type CreateAdminPricePolicyRequest = {
  vehicleTypeId: string;
  policyName: string;
  fromHour: number;
  toHour: number;
  ratePerHour: number;
  monthlyRate?: number | null;
};

export type UpdateAdminPricePolicyRequest = Partial<CreateAdminPricePolicyRequest>;

/** GET /api/v1/price-policies — ADMIN */
export const getAdminPricePolicies = async ({
  page = 1,
  limit = 50,
  vehicleTypeId,
}: GetAdminPricePoliciesParams = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (vehicleTypeId) params.set("vehicleTypeId", vehicleTypeId);

  const response = await fetch(`${API_BASE}/api/v1/price-policies?${params}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{
    pricePolicies?: AdminPricePolicy[];
    pagination?: AdminPricePolicyPagination;
  }>(response);

  if (!response.ok) {
    throw new AdminPricePolicyApiError(
      response.status,
      payload.message || "Không tải được bảng giá.",
    );
  }

  return {
    pricePolicies: payload.data?.pricePolicies ?? [],
    pagination: payload.data?.pagination,
  };
};

/** GET /api/v1/price-policies/:pricePolicyId — ADMIN */
export const getAdminPricePolicyById = async (pricePolicyId: string) => {
  const response = await fetch(
    `${API_BASE}/api/v1/price-policies/${encodeURIComponent(pricePolicyId)}`,
    { method: "GET", credentials: "include" },
  );
  const payload = await parseJson<{ pricePolicy?: AdminPricePolicy }>(response);

  if (!response.ok) {
    throw new AdminPricePolicyApiError(
      response.status,
      payload.message || "Không tìm thấy bảng giá.",
    );
  }

  if (!payload.data?.pricePolicy) {
    throw new AdminPricePolicyApiError(response.status, "Phản hồi thiếu dữ liệu bảng giá.");
  }

  return payload.data.pricePolicy;
};

/** POST /api/v1/price-policies — ADMIN */
export const createAdminPricePolicy = async (body: CreateAdminPricePolicyRequest) => {
  const response = await fetch(`${API_BASE}/api/v1/price-policies`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const payload = await parseJson<{ pricePolicy?: AdminPricePolicy }>(response);

  if (response.status !== 201) {
    throw new AdminPricePolicyApiError(
      response.status,
      payload.message || "Không tạo được bảng giá.",
    );
  }

  if (!payload.data?.pricePolicy) {
    throw new AdminPricePolicyApiError(response.status, "Phản hồi tạo bảng giá thiếu dữ liệu.");
  }

  return payload.data.pricePolicy;
};

/** PUT /api/v1/price-policies/:pricePolicyId — ADMIN */
export const updateAdminPricePolicy = async (
  pricePolicyId: string,
  body: UpdateAdminPricePolicyRequest,
) => {
  const response = await fetch(
    `${API_BASE}/api/v1/price-policies/${encodeURIComponent(pricePolicyId)}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    },
  );
  const payload = await parseJson<{ pricePolicy?: AdminPricePolicy }>(response);

  if (!response.ok) {
    throw new AdminPricePolicyApiError(
      response.status,
      payload.message || "Không cập nhật được bảng giá.",
    );
  }

  if (!payload.data?.pricePolicy) {
    throw new AdminPricePolicyApiError(response.status, "Phản hồi cập nhật bảng giá thiếu dữ liệu.");
  }

  return payload.data.pricePolicy;
};

/** DELETE /api/v1/price-policies/:pricePolicyId — ADMIN */
export const deleteAdminPricePolicy = async (pricePolicyId: string) => {
  const response = await fetch(
    `${API_BASE}/api/v1/price-policies/${encodeURIComponent(pricePolicyId)}`,
    { method: "DELETE", credentials: "include" },
  );
  const payload = await parseJson<{ pricePolicy?: AdminPricePolicy }>(response);

  if (!response.ok) {
    throw new AdminPricePolicyApiError(
      response.status,
      payload.message || "Không xóa được bảng giá.",
    );
  }

  return payload.data?.pricePolicy ?? null;
};
