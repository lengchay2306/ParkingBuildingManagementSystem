import { authenticatedFetch } from '@/lib/auth-api';

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

async function parsePaymentResponse<T>(
  response: Response,
  expectedStatus?: number,
): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  const ok =
    expectedStatus != null ? response.status === expectedStatus : response.ok;
  if (!ok) {
    throw new Error(payload?.message ?? 'Payment request failed');
  }
  return payload ?? {};
}

export type StaffBillQrResult = {
  orderCode: number;
  amount: number;
  totalHours: number;
  qrCode: string;
};

export type StaffPayment = {
  _id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | string;
  orderCode: number;
  paymentMethod?: string;
  parkingSessionId?: string | null;
  createdAt?: string;
};

export function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Prefer PENDING checkout bill, else latest payment for the session. */
export function pickCheckoutPayment(payments: StaffPayment[]): StaffPayment | null {
  if (payments.length === 0) {
    return null;
  }
  return (
    payments.find((payment) => payment.status?.toUpperCase() === 'PENDING') ??
    payments.find((payment) => payment.status?.toUpperCase() === 'PAID') ??
    payments[0] ??
    null
  );
}

/** GET /payment?parkingSessionId= — STAFF | MANAGER | ADMIN */
export async function getPaymentsByParkingSessionId(
  parkingSessionId: string,
): Promise<StaffPayment[]> {
  const params = new URLSearchParams({
    parkingSessionId: parkingSessionId.trim(),
    limit: '5',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const response = await authenticatedFetch(`/payment?${params.toString()}`);
  const payload = await parsePaymentResponse<{ payments?: StaffPayment[] }>(response);
  return Array.isArray(payload.data?.payments) ? payload.data.payments : [];
}

/** Build a scannable image URL from PayOS/BE `qrCode` EMV string (or pass-through if already an image URL). */
export function vietQrImageUri(qrCode: string, size = 280) {
  const trimmed = qrCode.trim();
  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(trimmed)}`;
}

export type SubscriptionCheckoutResult = {
  checkoutUrl: string;
};

/** POST /payment/subscription/create-link — CUSTOMER (BE returns checkoutUrl only). */
export async function createSubscriptionCheckoutLink(
  vehicleId: string,
): Promise<SubscriptionCheckoutResult> {
  const response = await authenticatedFetch('/payment/subscription/create-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleId, platform: 'mobile' }),
  });
  const payload = await parsePaymentResponse<{ checkoutUrl?: string }>(response, 201);
  const checkoutUrl = payload.data?.checkoutUrl;
  if (!checkoutUrl || typeof checkoutUrl !== 'string') {
    throw new Error(payload.message ?? 'Missing checkoutUrl');
  }
  return { checkoutUrl };
}

/** POST /payment/staff/bill-qr — STAFF | MANAGER | ADMIN */
export async function createStaffBillQr(parkingSessionId: string): Promise<StaffBillQrResult> {
  const response = await authenticatedFetch('/payment/staff/bill-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parkingSessionId }),
  });
  const payload = await parsePaymentResponse<StaffBillQrResult>(response);

  const data = payload.data;
  if (
    !data ||
    typeof data.qrCode !== 'string' ||
    !data.qrCode ||
    typeof data.orderCode !== 'number' ||
    typeof data.amount !== 'number'
  ) {
    throw new Error(payload.message ?? 'Incomplete bill QR response');
  }

  return {
    orderCode: data.orderCode,
    amount: data.amount,
    totalHours: typeof data.totalHours === 'number' ? data.totalHours : 0,
    qrCode: data.qrCode,
  };
}

/** POST /payment/check-payment — STAFF | MANAGER | ADMIN */
export async function checkStaffPayment(orderCode: number): Promise<string> {
  const response = await authenticatedFetch('/payment/check-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderCode }),
  });
  const payload = await parsePaymentResponse<{ message?: string }>(response);
  return payload.data?.message || payload.message || 'PAYMENT SUCCESSFULLY';
}
