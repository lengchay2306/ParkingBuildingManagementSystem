import { authFetch } from "@/lib/auth-fetch";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type ApiPayload<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class PaymentApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PaymentApiError";
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

const paymentErrorMessage = (status: number) => {
  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "Bạn không có quyền thực hiện thao tác thanh toán này.";
    default:
      return "Không thể xử lý thanh toán.";
  }
};

export type PricePolicy = {
  _id: string;
  vehicleTypeId?: { _id?: string; type?: string } | string;
  policyName?: string;
  fromHour?: number;
  toHour?: number | null;
  ratePerHour?: number;
  monthlyRate?: number | null;
};

export type PricePoliciesPagination = {
  currentPage: number;
  totalPage: number;
  totalItems: number;
  itemsPerPage: number;
};

export type GetPricePoliciesParams = {
  page?: number;
  limit?: number;
  vehicleTypeId?: string;
};

/** GET /api/v1/payment/price-policies — public */
export const getPricePolicies = async ({
  page = 1,
  limit = 10,
  vehicleTypeId,
}: GetPricePoliciesParams = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (vehicleTypeId) {
    params.set("vehicleTypeId", vehicleTypeId);
  }

  const response = await authFetch(`${API_BASE}/api/v1/payment/price-policies?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{
    pricePolicies?: PricePolicy[];
    pagination?: PricePoliciesPagination;
  }>(response);

  if (!response.ok) {
    throw new PaymentApiError(
      response.status,
      payload.message || paymentErrorMessage(response.status),
    );
  }

  return {
    pricePolicies: payload.data?.pricePolicies ?? [],
    pagination: payload.data?.pagination,
  };
};

/** Fetch all price policy tiers for a vehicle type (paginates past API limit of 10). */
export const getAllPricePoliciesForVehicleType = async (vehicleTypeId: string) => {
  const collected: PricePolicy[] = [];
  let page = 1;
  let totalPage = 1;

  do {
    const result = await getPricePolicies({ page, limit: 10, vehicleTypeId });
    collected.push(...result.pricePolicies);
    totalPage = result.pagination?.totalPage ?? 1;
    page += 1;
  } while (page <= totalPage);

  return collected.sort((left, right) => (left.fromHour ?? 0) - (right.fromHour ?? 0));
};

export const formatPricePolicyHourRange = (
  fromHour?: number,
  toHour?: number | null,
) => {
  if (fromHour === undefined) {
    return "—";
  }
  if (toHour === null || toHour === undefined || toHour >= 9999) {
    return `Từ giờ ${fromHour + 1} trở đi`;
  }
  if (fromHour === 0) {
    return `${toHour} giờ đầu`;
  }
  return `Giờ ${fromHour + 1}–${toHour}`;
};

/** Matches BE `POST /payment/staff/bill-qr` response `data`. */
export type StaffBillQrResult = {
  orderCode: number;
  amount: number;
  totalHours: number;
  qrCode: string;
};

/** POST /api/v1/payment/staff/bill-qr — STAFF | MANAGER | ADMIN */
export const createStaffBillQr = async (parkingSessionId: string) => {
  const response = await authFetch(`${API_BASE}/api/v1/payment/staff/bill-qr`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ parkingSessionId }),
  });
  const payload = await parseJson<StaffBillQrResult>(response);

  if (!response.ok) {
    throw new PaymentApiError(
      response.status,
      payload.message || paymentErrorMessage(response.status),
    );
  }

  const data = payload.data;
  if (
    !data ||
    typeof data.qrCode !== "string" ||
    data.qrCode.length === 0 ||
    typeof data.orderCode !== "number" ||
    typeof data.amount !== "number"
  ) {
    throw new PaymentApiError(response.status, payload.message || "Phản hồi tạo mã QR thiếu dữ liệu.");
  }

  return {
    orderCode: data.orderCode,
    amount: data.amount,
    totalHours: typeof data.totalHours === "number" ? data.totalHours : 0,
    qrCode: data.qrCode,
  };
};

/** Matches BE `POST /payment/check-payment` response `data`. */
export type CheckPaymentResult = {
  message: string;
};

/** POST /api/v1/payment/check-payment — STAFF | MANAGER | ADMIN */
export const checkStaffPayment = async (orderCode: number) => {
  const response = await authFetch(`${API_BASE}/api/v1/payment/check-payment`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ orderCode }),
  });
  const payload = await parseJson<{ message?: string }>(response);

  if (!response.ok) {
    throw new PaymentApiError(
      response.status,
      payload.message || paymentErrorMessage(response.status),
    );
  }

  return {
    message: payload.data?.message || payload.message || "Thanh toán thành công",
  } satisfies CheckPaymentResult;
};

/** Matches BE `POST /payment/subscription/create-link` response `data`. */
export type SubscriptionCheckoutResult = {
  checkoutUrl: string;
};

/** POST /api/v1/payment/subscription/create-link — CUSTOMER only */
export const createSubscriptionCheckoutLink = async (vehicleId: string) => {
  const response = await authFetch(`${API_BASE}/api/v1/payment/subscription/create-link`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ vehicleId }),
  });
  const payload = await parseJson<SubscriptionCheckoutResult>(response);

  if (response.status !== 201) {
    throw new PaymentApiError(
      response.status,
      payload.message || paymentErrorMessage(response.status),
    );
  }

  const checkoutUrl = payload.data?.checkoutUrl;
  if (typeof checkoutUrl !== "string" || checkoutUrl.length === 0) {
    throw new PaymentApiError(
      response.status,
      payload.message || "Phản hồi thiếu checkoutUrl.",
    );
  }

  return { checkoutUrl };
};

export const formatVnd = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
