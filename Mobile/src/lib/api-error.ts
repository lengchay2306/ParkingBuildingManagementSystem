/** Shared BE error envelope helpers for Mobile API clients. */

export type ApiErrorPayload = {
  status?: string;
  message?: string;
  data?: {
    message?: string;
  } | null;
};

export function extractApiErrorMessage(
  payload: unknown,
  fallback = 'Request failed',
): string {
  const p = payload as ApiErrorPayload | null | undefined;
  const top = typeof p?.message === 'string' ? p.message.trim() : '';
  if (top) {
    return top;
  }
  const nested =
    p?.data && typeof p.data === 'object' && typeof p.data.message === 'string'
      ? p.data.message.trim()
      : '';
  if (nested) {
    return nested;
  }
  return fallback;
}

export function resolveApiErrorMessage(
  error: unknown,
  fallback = 'Request failed',
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

export function isNotFoundApiError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('không tìm') ||
    message.includes('404') ||
    message.includes("doesn't exist") ||
    message.includes('does not exist') ||
    message.includes('no active')
  );
}

export type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

/**
 * Parse JSON body and throw Error with BE `message` when response is not OK.
 * Returns the full envelope so callers can read `data`.
 */
export async function parseApiEnvelope<T>(
  response: Response,
  fallbackMessage = 'Request failed',
  expectedStatus?: number,
): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  const ok =
    expectedStatus != null ? response.status === expectedStatus : response.ok;

  if (!ok) {
    throw new Error(extractApiErrorMessage(payload, fallbackMessage));
  }

  return payload ?? {};
}
