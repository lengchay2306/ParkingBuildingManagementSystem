import {
  cancelAdminPayment,
  getAdminPayments,
  getPaymentsByParkingSessionId,
} from "@/services/adminPayment.service";
import { createStaffBillQr, type StaffBillQrResult } from "@/services/payment.service";

export type StaffBillQrWithPayment = StaffBillQrResult & {
  paymentId: string;
  parkingSessionId: string;
};

const PAYMENT_ALREADY_EXISTS_PATTERN = /already|đã.*tạo|created/i;

export async function findPendingPaymentByParkingSessionId(parkingSessionId: string) {
  const payments = await getPaymentsByParkingSessionId(parkingSessionId);
  return payments.find((payment) => payment.status === "PENDING") ?? null;
}

export async function findPendingPaymentByVehicleId(vehicleId: string) {
  const { payments } = await getAdminPayments({
    vehicleId,
    status: "PENDING",
    limit: 1,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  return payments[0] ?? null;
}

export async function findPendingPaymentByOrderCode(orderCode: number) {
  const { payments } = await getAdminPayments({
    orderCode,
    status: "PENDING",
    limit: 1,
  });
  return payments[0] ?? null;
}

export async function cancelPendingPayment(paymentId: string) {
  return cancelAdminPayment(paymentId);
}

export async function cancelPendingPaymentSafe(paymentId: string) {
  try {
    await cancelPendingPayment(paymentId);
    return true;
  } catch {
    return false;
  }
}

export async function createStaffBillQrForSession(
  parkingSessionId: string,
): Promise<StaffBillQrWithPayment> {
  try {
    const bill = await createStaffBillQr(parkingSessionId);
    const pending = await findPendingPaymentByParkingSessionId(parkingSessionId);
    if (!pending?._id) {
      throw new Error("Không tìm thấy hóa đơn PENDING sau khi tạo QR.");
    }
    return {
      ...bill,
      // Prefer amount from GET /payment (source of truth), not only bill-qr payload.
      amount: typeof pending.amount === "number" ? pending.amount : bill.amount,
      paymentId: pending._id,
      parkingSessionId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!PAYMENT_ALREADY_EXISTS_PATTERN.test(message)) {
      throw error;
    }

    const pending = await findPendingPaymentByParkingSessionId(parkingSessionId);
    if (!pending?._id) {
      throw error;
    }

    await cancelPendingPayment(pending._id);
    return createStaffBillQrForSession(parkingSessionId);
  }
}

const SUBSCRIPTION_CHECKOUT_STORAGE_KEY = "driver-pending-subscription-checkout";

export type PendingSubscriptionCheckout = {
  vehicleId: string;
  licensePlate: string;
  checkoutUrl: string;
  paymentId?: string;
  createdAt: number;
};

export function savePendingSubscriptionCheckout(checkout: PendingSubscriptionCheckout) {
  sessionStorage.setItem(SUBSCRIPTION_CHECKOUT_STORAGE_KEY, JSON.stringify(checkout));
}

export function loadPendingSubscriptionCheckout(vehicleId?: string) {
  const raw = sessionStorage.getItem(SUBSCRIPTION_CHECKOUT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingSubscriptionCheckout;
    if (!parsed.vehicleId || !parsed.checkoutUrl) {
      return null;
    }
    if (vehicleId && parsed.vehicleId !== vehicleId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingSubscriptionCheckout() {
  sessionStorage.removeItem(SUBSCRIPTION_CHECKOUT_STORAGE_KEY);
}

export async function attachPaymentIdToSubscriptionCheckout(
  checkout: PendingSubscriptionCheckout,
): Promise<PendingSubscriptionCheckout> {
  if (checkout.paymentId) {
    return checkout;
  }

  try {
    const pending = await findPendingPaymentByVehicleId(checkout.vehicleId);
    if (!pending?._id) {
      return checkout;
    }
    return { ...checkout, paymentId: pending._id };
  } catch {
    return checkout;
  }
}

export async function cancelPendingSubscriptionCheckout(
  checkout: PendingSubscriptionCheckout | null,
) {
  if (!checkout) {
    clearPendingSubscriptionCheckout();
    return;
  }

  const resolved = await attachPaymentIdToSubscriptionCheckout(checkout);
  if (resolved.paymentId) {
    await cancelPendingPaymentSafe(resolved.paymentId);
  }

  clearPendingSubscriptionCheckout();
}
