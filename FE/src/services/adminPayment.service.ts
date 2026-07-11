import { authFetch } from "@/lib/auth-fetch";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type ApiPayload<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class AdminPaymentApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminPaymentApiError";
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

export type PaymentStatus = "PENDING" | "PAID" | "CANCELLED";
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER";

export type AdminPaymentVehicle = {
  _id?: string;
  licensePlate?: string;
  vehicleTypeId?: { _id?: string; type?: string } | string;
};

export type AdminPaymentParkingSession = {
  _id?: string;
  licensePlate?: string | null;
  status?: string;
  isGuest?: boolean;
  sessionType?: string;
  checkInTime?: string;
  checkOutTime?: string | null;
  vehicleId?: AdminPaymentVehicle | string | null;
  parkingSlotId?: { _id?: string; slotNumber?: string; floorId?: { floorName?: string } } | string;
};

export type AdminPayment = {
  _id: string;
  parkingSessionId?: string | null | AdminPaymentParkingSession;
  vehicleId?: string | null | AdminPaymentVehicle;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  orderCode: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminPaymentPagination = {
  page?: number;
  limit?: number;
  totalCount?: number;
  totalPages?: number;
};

export type GetAdminPaymentsParams = {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  orderCode?: number;
  licensePlate?: string;
  sortBy?: "createdAt" | "amount" | "orderCode" | "status";
  sortOrder?: "asc" | "desc" | 1 | -1;
};

/** GET /api/v1/payment — ADMIN | MANAGER | STAFF */
export const getAdminPayments = async ({
  page = 1,
  limit = 12,
  status,
  paymentMethod,
  orderCode,
  licensePlate,
  sortBy = "createdAt",
  sortOrder = "desc",
}: GetAdminPaymentsParams = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder: String(sortOrder),
  });
  if (status) params.set("status", status);
  if (paymentMethod) params.set("paymentMethod", paymentMethod);
  if (orderCode !== undefined) params.set("orderCode", String(orderCode));
  if (licensePlate) params.set("licensePlate", licensePlate);

  const response = await authFetch(`${API_BASE}/api/v1/payment?${params}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{
    payments?: AdminPayment[];
    pagination?: AdminPaymentPagination;
  }>(response);

  if (!response.ok) {
    throw new AdminPaymentApiError(
      response.status,
      payload.message || "Không tải được danh sách thanh toán.",
    );
  }

  return {
    payments: payload.data?.payments ?? [],
    pagination: payload.data?.pagination,
  };
};

/** GET /api/v1/payment/:paymentId — ADMIN | MANAGER | STAFF */
export const getAdminPaymentById = async (paymentId: string) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/payment/${encodeURIComponent(paymentId)}`,
    { method: "GET", credentials: "include" },
  );
  const payload = await parseJson<{ payment?: AdminPayment }>(response);

  if (!response.ok) {
    throw new AdminPaymentApiError(
      response.status,
      payload.message || "Không tìm thấy giao dịch thanh toán.",
    );
  }

  if (!payload.data?.payment) {
    throw new AdminPaymentApiError(response.status, "Phản hồi thiếu dữ liệu thanh toán.");
  }

  return payload.data.payment;
};

/** DELETE /api/v1/payment/:paymentId — ADMIN only */
export const deleteAdminPayment = async (paymentId: string) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/payment/${encodeURIComponent(paymentId)}`,
    { method: "DELETE", credentials: "include" },
  );
  const payload = await parseJson<{ deletedPayment?: AdminPayment }>(response);

  if (!response.ok) {
    throw new AdminPaymentApiError(
      response.status,
      payload.message || "Không xóa được giao dịch thanh toán.",
    );
  }

  return payload.data?.deletedPayment ?? null;
};

/** PUT /api/v1/payment/cancel/:paymentId — ADMIN | MANAGER | STAFF (PENDING only) */
export const cancelAdminPayment = async (paymentId: string) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/payment/cancel/${encodeURIComponent(paymentId)}`,
    { method: "PUT", credentials: "include" },
  );
  const payload = await parseJson<{ updatedPayment?: AdminPayment }>(response);

  if (!response.ok) {
    throw new AdminPaymentApiError(
      response.status,
      payload.message || "Không hủy được hóa đơn chờ thanh toán.",
    );
  }

  if (!payload.data?.updatedPayment) {
    throw new AdminPaymentApiError(response.status, "Phản hồi hủy hóa đơn thiếu dữ liệu.");
  }

  return payload.data.updatedPayment;
};

export const getPaymentLicensePlate = (payment: AdminPayment) => {
  if (payment.vehicleId && typeof payment.vehicleId === "object") {
    return payment.vehicleId.licensePlate ?? null;
  }
  if (payment.parkingSessionId && typeof payment.parkingSessionId === "object") {
    return payment.parkingSessionId.licensePlate ?? null;
  }
  return null;
};

export const getPaymentKindLabel = (payment: AdminPayment) => {
  if (payment.parkingSessionId) {
    return "Checkout gửi xe";
  }
  if (payment.vehicleId) {
    return "Thẻ tháng";
  }
  return "Khác";
};
