const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type ApiPayload<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class DashboardApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DashboardApiError";
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

export type DashboardStats = {
  modelStats?: Record<string, { total?: number; [key: string]: unknown }>;
  summary?: Record<string, unknown>;
  [key: string]: unknown;
};

export type RevenueBreakdownItem = {
  day?: number;
  month?: number;
  totalAmount: number;
  transactionCount: number;
};

export type RevenueStats = {
  status?: string;
  groupBy?: string | null;
  filter?: { year?: number; month?: number; day?: number };
  totalAmount: number;
  transactionCount: number;
  breakdown?: RevenueBreakdownItem[];
  error?: string;
};

export type GetRevenueParams = {
  year?: number;
  month?: number;
  day?: number;
  groupBy?: "day" | "month";
  status?: "PENDING" | "PAID" | "CANCELLED";
};

/** GET /api/v1/dashboard — ADMIN | MANAGER */
export const getDashboardStats = async () => {
  const response = await fetch(`${API_BASE}/api/v1/dashboard`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<DashboardStats>(response);

  if (!response.ok) {
    throw new DashboardApiError(
      response.status,
      payload.message || "Không tải được thống kê dashboard.",
    );
  }

  if (!payload.data) {
    throw new DashboardApiError(response.status, "Phản hồi dashboard thiếu dữ liệu.");
  }

  return payload.data;
};

/** GET /api/v1/dashboard/revenue — ADMIN | MANAGER */
export const getRevenueStats = async (params: GetRevenueParams = {}) => {
  const search = new URLSearchParams();
  if (params.year != null) search.set("year", String(params.year));
  if (params.month != null) search.set("month", String(params.month));
  if (params.day != null) search.set("day", String(params.day));
  if (params.groupBy) search.set("groupBy", params.groupBy);
  if (params.status) search.set("status", params.status);

  const query = search.toString();
  const response = await fetch(
    `${API_BASE}/api/v1/dashboard/revenue${query ? `?${query}` : ""}`,
    {
      method: "GET",
      credentials: "include",
    },
  );
  const payload = await parseJson<{ revenue?: RevenueStats }>(response);

  if (!response.ok) {
    throw new DashboardApiError(
      response.status,
      payload.message || "Không tải được thống kê doanh thu.",
    );
  }

  const revenue = payload.data?.revenue;
  if (!revenue) {
    throw new DashboardApiError(response.status, "Phản hồi doanh thu thiếu dữ liệu.");
  }

  if (revenue.error) {
    throw new DashboardApiError(400, revenue.error);
  }

  return revenue;
};
