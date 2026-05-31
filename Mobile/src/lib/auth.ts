export const ROLE_TO_ROUTE = {
  STAFF: '/staff',
  MANAGER: '/manager',
  CUSTOMER: '/driver',
  ADMIN: '/admin',
} as const;

export type RoleName = keyof typeof ROLE_TO_ROUTE;

type AccessTokenPayload = {
  roleName?: string;
};

export function normalizeRole(value?: string | null): RoleName | null {
  if (!value) {
    return null;
  }
  const upper = value.toUpperCase();
  return upper in ROLE_TO_ROUTE ? (upper as RoleName) : null;
}

export function getRoleHome(role: RoleName) {
  return ROLE_TO_ROUTE[role];
}

function decodeBase64Url(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? padded : padded + '='.repeat(4 - (padded.length % 4));

  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(pad);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(pad, 'base64').toString('utf8');
  }

  throw new Error('No base64 decoder available');
}

export function getRoleFromAccessToken(token: string | null | undefined): RoleName | null {
  if (!token) {
    return null;
  }

  try {
    const segment = token.split('.')[1];
    if (!segment) {
      return null;
    }
    const payload = JSON.parse(decodeBase64Url(segment)) as AccessTokenPayload;
    return normalizeRole(payload.roleName);
  } catch {
    return null;
  }
}
