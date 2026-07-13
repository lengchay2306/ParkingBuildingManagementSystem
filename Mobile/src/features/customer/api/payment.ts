import { authenticatedFetch } from '@/lib/auth-api';

export type PricePolicy = {
  _id: string;
  vehicleTypeId?: { _id?: string; type?: string } | string;
  policyName?: string;
  fromHour?: number;
  toHour?: number | null;
  ratePerHour?: number;
  monthlyRate?: number | null;
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

async function parsePaymentResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    const nested =
      payload?.data && typeof payload.data === 'object' && 'message' in payload.data
        ? String((payload.data as { message?: string }).message ?? '')
        : '';
    throw new Error(payload?.message || nested || 'Request failed');
  }
  return payload ?? {};
}

export function formatVnd(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) {
    return '—';
  }
  return `${amount.toLocaleString('vi-VN')}₫`;
}

export function formatPricePolicyHourRange(fromHour?: number, toHour?: number | null) {
  if (fromHour === undefined) {
    return '—';
  }
  if (toHour === null || toHour === undefined || toHour >= 9999) {
    return `Từ giờ ${fromHour + 1} trở đi`;
  }
  if (fromHour === 0) {
    return `${toHour} giờ đầu`;
  }
  return `Giờ ${fromHour + 1}–${toHour}`;
}

/** GET /payment/price-policies?vehicleTypeId= — same as FE. */
export async function getPricePolicies(options?: {
  page?: number;
  limit?: number;
  vehicleTypeId?: string;
}): Promise<{
  pricePolicies: PricePolicy[];
  totalPage: number;
}> {
  const params = new URLSearchParams({
    page: String(options?.page ?? 1),
    limit: String(options?.limit ?? 10),
  });
  if (options?.vehicleTypeId) {
    params.set('vehicleTypeId', options.vehicleTypeId);
  }
  const response = await authenticatedFetch(`/payment/price-policies?${params.toString()}`);
  const payload = await parsePaymentResponse<{
    pricePolicies?: PricePolicy[];
    pagination?: { totalPage?: number };
  }>(response);
  return {
    pricePolicies: payload.data?.pricePolicies ?? [],
    totalPage: payload.data?.pagination?.totalPage ?? 1,
  };
}

/** Fetch all hourly/monthly tiers for a vehicle type (paginates like FE). */
export async function getAllPricePoliciesForVehicleType(
  vehicleTypeId: string,
): Promise<PricePolicy[]> {
  const collected: PricePolicy[] = [];
  let page = 1;
  let totalPage = 1;
  do {
    const result = await getPricePolicies({ page, limit: 10, vehicleTypeId });
    collected.push(...result.pricePolicies);
    totalPage = result.totalPage;
    page += 1;
  } while (page <= totalPage);

  return collected.sort((left, right) => (left.fromHour ?? 0) - (right.fromHour ?? 0));
}
