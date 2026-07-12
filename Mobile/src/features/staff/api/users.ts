import { authenticatedFetch } from '@/lib/auth-api';

export type StaffUserSummary = {
  _id: string;
  fullName?: string;
  phone?: string;
  email?: string;
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

/** GET /users/:userId — ADMIN | MANAGER | STAFF */
export async function getUserById(userId: string): Promise<StaffUserSummary> {
  const response = await authenticatedFetch(`/users/${encodeURIComponent(userId)}`);
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<{
    user?: StaffUserSummary;
  }> | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? 'Failed to load user');
  }

  const user = payload?.data?.user;
  if (!user?._id) {
    throw new Error(payload?.message ?? 'User response is missing data');
  }

  return user;
}

export function resolveOwnerUserId(
  userId: string | { _id?: string } | null | undefined,
): string | null {
  if (!userId) {
    return null;
  }
  if (typeof userId === 'string') {
    const trimmed = userId.trim();
    return trimmed || null;
  }
  const id = userId._id?.trim();
  return id || null;
}
