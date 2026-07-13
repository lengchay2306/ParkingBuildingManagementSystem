import { Platform } from 'react-native';

import {
  CUSTOMER_ROUTES,
  type PostLoginRoute,
} from '@/roles';

export type { PostLoginRoute } from '@/roles';
export { resolvePostLoginRoute } from '@/roles';

type StoredCookie = {
  name?: string;
  value?: string;
};

type CookieManagerType = {
  setFromResponse: (url: string, cookie: string) => Promise<boolean>;
  clearAll: (useWebKit?: boolean) => Promise<boolean>;
  clearByName?: (url: string, name: string, useWebKit?: boolean) => Promise<boolean>;
  flush?: () => Promise<void>;
  removeSessionCookies?: () => Promise<boolean>;
  get: (url: string) => Promise<Record<string, StoredCookie>>;
};

let CookieManager: CookieManagerType | null = null;

if (Platform.OS !== 'web') {
  try {
    CookieManager = require('@react-native-cookies/cookies').default as CookieManagerType;
  } catch {
    CookieManager = null;
  }
}

type AuthResponse = {
  status: string;
  data?: {
    message?: string;
    user?: UserProfile;
  };
  message?: string;
};

export type VehicleTypeRef = {
  _id?: string;
  type?: string;
};

export type MonthlyCardRef = {
  _id?: string;
  cardCode?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
};

export type UserVehicle = {
  _id: string;
  licensePlate: string;
  vehicleTypeId?: VehicleTypeRef | string;
  monthlyCardId?: MonthlyCardRef | null;
  status?: string;
};

export type UserProfile = {
  _id: string;
  email: string;
  fullName: string;
  phone?: string;
  roleId?:
    | {
        _id?: string;
        roleName?: string;
      }
    | string;
  roleName?: string;
  status?: string;
  vehicles?: UserVehicle[];
  createdAt?: string;
  updatedAt?: string;
};

let memoryPostLoginRoute: PostLoginRoute = CUSTOMER_ROUTES.home;

function normalizeApiBaseUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is missing. Copy Mobile/.env.example to Mobile/.env, set the API URL, then restart Expo with: npx expo start -c',
    );
  }
  return value.replace(/\/+$/, '');
}

export const API_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);

const AUTH_REFRESH_PATH = `${API_URL}/auth/refresh-token`;

let refreshInFlight: Promise<boolean> | null = null;

function resolveApiUrl(path: string) {
  if (path.startsWith('http')) {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalized}`;
}

function isRefreshTokenRequest(url: string) {
  return url.includes(AUTH_REFRESH_PATH);
}

async function parseApiResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as AuthResponse | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.data?.message ?? 'Request failed');
  }

  return payload;
}

async function getCookieHeader(url: string): Promise<string | undefined> {
  if (!CookieManager) {
    return undefined;
  }
  try {
    const jar = await CookieManager.get(url);
    const parts = Object.values(jar ?? {})
      .map((entry) => {
        const name = entry?.name?.trim();
        const value = entry?.value ?? '';
        return name ? `${name}=${value}` : '';
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join('; ') : undefined;
  } catch {
    return undefined;
  }
}

async function sessionFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers as HeadersInit);
  const cookieHeader = await getCookieHeader(url);
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }
  return fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });
}

function collectSetCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };

  if (typeof headers.getSetCookie === 'function') {
    const list = headers.getSetCookie();
    if (list?.length) {
      return list.filter(Boolean);
    }
  }

  const raw = typeof headers.raw === 'function' ? headers.raw() : undefined;
  const fromRaw = raw?.['set-cookie'] ?? raw?.['Set-Cookie'];
  if (fromRaw?.length) {
    return fromRaw.filter(Boolean);
  }

  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

async function persistCookies(response: Response) {
  if (!CookieManager) {
    return;
  }
  const setCookies = collectSetCookieHeaders(response);
  if (setCookies.length === 0) {
    return;
  }
  const cookieUrl =
    response.url && !response.url.startsWith('about:') ? response.url : API_URL;
  for (const setCookie of setCookies) {
    await CookieManager.setFromResponse(cookieUrl, setCookie);
  }
  if (typeof CookieManager.flush === 'function') {
    await CookieManager.flush();
  }
}

/** Drop local auth cookies so logout/login cannot reuse a previous session. */
async function clearLocalSession() {
  memoryPostLoginRoute = CUSTOMER_ROUTES.home;
  if (!CookieManager) {
    return;
  }

  try {
    const cookieNames = ['accessToken', 'refreshToken'] as const;
    for (const name of cookieNames) {
      if (typeof CookieManager.clearByName === 'function') {
        await CookieManager.clearByName(API_URL, name).catch(() => undefined);
      }
    }
    await CookieManager.clearAll();
    if (typeof CookieManager.removeSessionCookies === 'function') {
      await CookieManager.removeSessionCookies().catch(() => undefined);
    }
    if (typeof CookieManager.flush === 'function') {
      await CookieManager.flush();
    }
  } catch {
    // Local clear is best-effort; network logout may still have succeeded.
  }
}

async function requestRefreshToken(): Promise<boolean> {
  const url = resolveApiUrl(AUTH_REFRESH_PATH);
  const response = await sessionFetch(url, {
    method: 'POST',
  });

  await persistCookies(response);

  if (response.status === 400 || response.status === 401) {
    return false;
  }

  if (!response.ok) {
    await parseApiResponse(response);
  }

  return true;
}

function refreshSessionOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = requestRefreshToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** POST /auth/refresh-token — returns false if refresh cookie is missing or invalid. */
export async function refreshSession(): Promise<boolean> {
  return refreshSessionOnce();
}

/**
 * Authenticated fetch: sends cookies, retries once after refresh when access token expired (401).
 */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = resolveApiUrl(path);

  let response = await sessionFetch(url, init);

  if (response.status === 401 && !isRefreshTokenRequest(url)) {
    const refreshed = await refreshSessionOnce();
    if (refreshed) {
      response = await sessionFetch(url, init);
    }
  }

  return response;
}

export type RegisterPayload = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
};

export async function register(payload: RegisterPayload) {
  const response = await fetch(resolveApiUrl('/auth/register'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      fullName: payload.fullName.trim(),
      phone: payload.phone.trim(),
    }),
  });

  return parseApiResponse(response);
}

export async function login(email: string, password: string) {
  const url = resolveApiUrl('/auth/login');
  // Avoid sending a previous account's cookies with the new login.
  await clearLocalSession();

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${url}. Check EXPO_PUBLIC_API_URL`,
    );
  }

  await persistCookies(response);
  return parseApiResponse(response);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    if (typeof globalThis.atob !== 'function') {
      return null;
    }
    const json = globalThis.atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Fallback when profile fetch fails but accessToken cookie exists after login. */
export async function getRoleNameFromAccessToken(): Promise<string | null> {
  if (!CookieManager) {
    return null;
  }
  try {
    const jar = await CookieManager.get(API_URL);
    const token = jar?.accessToken?.value;
    if (!token) {
      return null;
    }
    const payload = decodeJwtPayload(token);
    const role = payload?.roleName;
    return typeof role === 'string' && role.trim() ? role.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function extractRoleNameFromProfile(user: UserProfile | undefined): string | null {
  if (!user) {
    return null;
  }
  if (typeof user.roleName === 'string' && user.roleName.trim()) {
    return user.roleName.trim().toUpperCase();
  }
  const roleId = user.roleId;
  if (roleId && typeof roleId === 'object' && typeof roleId.roleName === 'string' && roleId.roleName.trim()) {
    return roleId.roleName.trim().toUpperCase();
  }
  return null;
}

export async function setStoredPostLoginRoute(route: PostLoginRoute): Promise<void> {
  memoryPostLoginRoute = route;
}

export async function getStoredPostLoginRoute(): Promise<PostLoginRoute> {
  return memoryPostLoginRoute;
}

/** Resolve role after login (profile first, then JWT in accessToken cookie). */
export async function resolveRoleAfterLogin(): Promise<string | null> {
  try {
    const profile = await getMyProfile();
    return extractRoleNameFromProfile(profile);
  } catch {
    return getRoleNameFromAccessToken();
  }
}

/** GET /users/my-profile — requires session cookies from login. */
export async function getMyProfile(): Promise<UserProfile> {
  const response = await authFetch('/users/my-profile');
  const payload = (await parseApiResponse(response)) as AuthResponse | null;
  const user = payload?.data?.user;
  if (!user) {
    throw new Error(payload?.message ?? 'Profile response is missing user data');
  }
  return user;
}

export type UpdateMyProfilePayload = {
  fullName?: string;
  phone?: string;
};

/** PUT /users/my-profile — at least one of fullName or phone is required. */
export async function updateMyProfile(payload: UpdateMyProfilePayload): Promise<UserProfile> {
  const response = await authFetch('/users/my-profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = (await parseApiResponse(response)) as AuthResponse | null;
  const user = result?.data?.user;
  if (!user) {
    throw new Error(result?.message ?? 'Update response is missing user data');
  }
  return user;
}

export async function logout() {
  try {
    const response = await authFetch('/auth/logout', {
      method: 'DELETE',
    });

    // 401 = session already gone server-side; still clear local cookies.
    if (!response.ok && response.status !== 401) {
      await parseApiResponse(response);
    }
  } catch {
    // Remote logout may fail (network / expired session). Local cookies must still be cleared
    // so the next login cannot reuse the previous account.
  } finally {
    await clearLocalSession();
  }
}

/** POST /auth/forgot-password — public (email opens FE web reset link). */
export async function forgotPassword(email: string): Promise<string> {
  const response = await fetch(resolveApiUrl('/auth/forgot-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const payload = (await response.json().catch(() => null)) as AuthResponse | null;
  if (!response.ok) {
    throw new Error(
      payload?.message ??
        payload?.data?.message ??
        'Cannot send password reset email',
    );
  }
  return (
    payload?.data?.message ??
    payload?.message ??
    'Password reset email sent successfully'
  );
}

/** FE web app base (no trailing slash) — forgot/reset password pages. */
export function getWebAppBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();
  if (!raw) {
    return 'https://parking-building-management-system-phi.vercel.app';
  }
  return raw.replace(/\/+$/, '');
}

export function getWebForgotPasswordUrl(): string {
  return `${getWebAppBaseUrl()}/forgot-password`;
}

export function getWebResetPasswordUrl(): string {
  return `${getWebAppBaseUrl()}/reset-password`;
}

/** Session-authenticated fetch for role-specific API modules. */
export function authenticatedFetch(path: string, init: RequestInit = {}) {
  return authFetch(path, init);
}
