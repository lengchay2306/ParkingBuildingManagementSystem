import { authenticatedFetch } from '@/lib/auth-api';
import { parseApiEnvelope, type ApiEnvelope } from '@/lib/api-error';

async function parsePaymentResponse<T>(
  response: Response,
  expectedStatus?: number,
): Promise<ApiEnvelope<T>> {
  return parseApiEnvelope<T>(response, 'Payment request failed', expectedStatus);
}

export type StaffBillQrResult = {
  orderCode: number;
  amount: number;
  totalHours: number;
  qrCode: string;
};

export type StaffBillQrWithPayment = StaffBillQrResult & {
  paymentId: string;
  parkingSessionId: string;
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

/** Prefer PENDING checkout bill, else PAID, else latest. */
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

/** PUT /payment/cancel/:paymentId — STAFF | MANAGER | ADMIN (PENDING only) */
export async function cancelStaffPayment(paymentId: string): Promise<StaffPayment> {
  const response = await authenticatedFetch(
    `/payment/cancel/${encodeURIComponent(paymentId.trim())}`,
    { method: 'PUT' },
  );
  const payload = await parsePaymentResponse<{ updatedPayment?: StaffPayment }>(response);
  const updated = payload.data?.updatedPayment;
  if (!updated?._id) {
    throw new Error(payload.message ?? 'Cancel payment failed');
  }
  return updated;
}

export class PaymentNotCancellableError extends Error {
  status: 'PAID' | 'CANCELLED';

  constructor(status: 'PAID' | 'CANCELLED', message: string) {
    super(message);
    this.name = 'PaymentNotCancellableError';
    this.status = status;
  }
}

/** GET /payment/:paymentId — STAFF | MANAGER | ADMIN */
export async function getStaffPaymentById(paymentId: string): Promise<StaffPayment> {
  const response = await authenticatedFetch(
    `/payment/${encodeURIComponent(paymentId.trim())}`,
  );
  const payload = await parsePaymentResponse<{ payment?: StaffPayment }>(response);
  const payment = payload.data?.payment;
  if (!payment?._id) {
    throw new Error(payload.message ?? 'Payment not found');
  }
  return payment;
}

/** Cancel only when still PENDING (and not paid on PayOS). */
export async function cancelStaffPaymentIfAllowed(paymentId: string): Promise<StaffPayment> {
  const payment = await getStaffPaymentById(paymentId);
  const status = payment.status?.toUpperCase();

  if (status === 'PAID') {
    throw new PaymentNotCancellableError(
      'PAID',
      'Thanh toán đã hoàn tất — không thể hủy QR. Hãy bấm xác nhận ra cổng.',
    );
  }

  if (status === 'CANCELLED') {
    throw new PaymentNotCancellableError(
      'CANCELLED',
      'Hóa đơn này đã được hủy trước đó.',
    );
  }

  try {
    return await cancelStaffPayment(paymentId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/paid|cannot be cancelled|đã.*thanh toán|cancelled or paid/i.test(message)) {
      throw new PaymentNotCancellableError(
        'PAID',
        'Thanh toán đã hoàn tất — không thể hủy QR. Hãy bấm xác nhận ra cổng.',
      );
    }
    throw error;
  }
}

export async function cancelStaffPaymentSafe(paymentId: string): Promise<boolean> {
  try {
    await cancelStaffPaymentIfAllowed(paymentId);
    return true;
  } catch {
    return false;
  }
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

const PAYMENT_ALREADY_EXISTS_PATTERN = /already|đã.*tạo|created/i;

/**
 * Create VietQR for a session and resolve `paymentId` via GET /payment
 * so staff can cancel with PUT /payment/cancel/:paymentId.
 */
export async function createStaffBillQrForSession(
  parkingSessionId: string,
): Promise<StaffBillQrWithPayment> {
  try {
    const bill = await createStaffBillQr(parkingSessionId);
    const payments = await getPaymentsByParkingSessionId(parkingSessionId);
    const pending =
      payments.find((payment) => payment.status?.toUpperCase() === 'PENDING') ?? null;
    if (!pending?._id) {
      throw new Error('Không tìm thấy hóa đơn PENDING sau khi tạo QR.');
    }
    return {
      ...bill,
      amount: typeof pending.amount === 'number' ? pending.amount : bill.amount,
      paymentId: pending._id,
      parkingSessionId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!PAYMENT_ALREADY_EXISTS_PATTERN.test(message)) {
      throw error;
    }

    const payments = await getPaymentsByParkingSessionId(parkingSessionId);
    const pending =
      payments.find((payment) => payment.status?.toUpperCase() === 'PENDING') ?? null;
    if (!pending?._id) {
      throw error;
    }

    await cancelStaffPayment(pending._id);
    return createStaffBillQrForSession(parkingSessionId);
  }
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
