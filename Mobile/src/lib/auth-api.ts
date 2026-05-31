import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { getRoleFromAccessToken, type RoleName } from '@/lib/auth';

type CookieManagerType = {
  get: (url: string) => Promise<Record<string, { value: string }>>;
  setFromResponse: (url: string, cookie: string) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
};

let CookieManager: CookieManagerType | null = null;

if (Platform.OS !== 'web') {
  try {
    // Native-only optional dependency; dynamic require avoids web bundler issues.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    CookieManager = require('@react-native-cookies/cookies').default as CookieManagerType;
  } catch {
    CookieManager = null;
  }
}

type AuthResponse = {
  status: string;
  data?: {
    message?: string;
  };
  message?: string;
};

const ACCESS_TOKEN_STORAGE_KEY = 'parkos-access-token';

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

const AUTH_REFRESH_PATH = `${API_URL}/auth/refresh-token`;

let refreshInFlight: Promise<RoleName | null> | null = null;
let cachedAccessToken: string | null = null;

function getApiOrigin(): string {
  if (!API_URL) {
    return '';
  }

  try {
    return new URL(API_URL).origin;
  } catch {
    return API_URL.replace(/\/api\/v1\/?$/, '');
  }
}

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

function extractAccessTokenFromSetCookie(setCookie: string | null): string | null {
  if (!setCookie) {
    return null;
  }
  const match = setCookie.match(/(?:^|,\s*)accessToken=([^;,]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getAllSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

async function rememberAccessToken(token: string) {
  cachedAccessToken = token;
  try {
    await AsyncStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage failures; in-memory cache still works for this session.
  }
}

async function readCachedAccessToken(): Promise<string | null> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  try {
    cachedAccessToken = await AsyncStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    cachedAccessToken = null;
  }

  return cachedAccessToken;
}

async function clearAccessTokenCache() {
  cachedAccessToken = null;
  try {
    await AsyncStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures during logout.
  }
}

async function readAccessTokenFromStore(): Promise<string | null> {
  const cached = await readCachedAccessToken();
  if (cached) {
    return cached;
  }

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  if (!CookieManager) {
    return null;
  }

  const origins = [getApiOrigin(), API_URL].filter((origin): origin is string => Boolean(origin));
  for (const origin of origins) {
    const cookies = await CookieManager.get(origin);
    const token = cookies?.accessToken?.value;
    if (token) {
      await rememberAccessToken(token);
      return token;
    }
  }

  return null;
}

async function persistCookies(response: Response): Promise<string | null> {
  const setCookieHeaders = getAllSetCookies(response);
  let accessToken: string | null = null;

  for (const header of setCookieHeaders) {
    const token = extractAccessTokenFromSetCookie(header);
    if (token) {
      accessToken = token;
    }

    if (CookieManager) {
      await CookieManager.setFromResponse(response.url, header);
    }
  }

  if (accessToken) {
    await rememberAccessToken(accessToken);
  }

  return accessToken;
}

async function resolveRoleFromAuth(response: Response): Promise<RoleName | null> {
  for (const header of getAllSetCookies(response)) {
    const role = getRoleFromAccessToken(extractAccessTokenFromSetCookie(header));
    if (role) {
      return role;
    }
  }

  const cached = await readCachedAccessToken();
  const roleFromCache = getRoleFromAccessToken(cached);
  if (roleFromCache) {
    return roleFromCache;
  }

  const tokenFromStore = await readAccessTokenFromStore();
  return getRoleFromAccessToken(tokenFromStore);
}

async function parseApiResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as AuthResponse | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.data?.message ?? 'Request failed');
  }

  return payload;
}

async function requestRefreshToken(): Promise<RoleName | null> {
  const response = await fetch(resolveApiUrl(AUTH_REFRESH_PATH), {
    method: 'POST',
    credentials: 'include',
  });

  await persistCookies(response);

  if (response.status === 400 || response.status === 401) {
    await clearAccessTokenCache();
    return null;
  }

  if (!response.ok) {
    await parseApiResponse(response);
  }

  return resolveRoleFromAuth(response);
}

function refreshSessionOnce(): Promise<RoleName | null> {
  if (!refreshInFlight) {
    refreshInFlight = requestRefreshToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** POST /auth/refresh-token — returns role when session is valid, null otherwise. */
export async function refreshSession(): Promise<RoleName | null> {
  return refreshSessionOnce();
}

/**
 * Authenticated fetch: sends cookies, retries once after refresh when access token expired (401).
 */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = resolveApiUrl(path);
  const options: RequestInit = {
    ...init,
    credentials: 'include',
  };

  let response = await fetch(url, options);

  if (response.status === 401 && !isRefreshTokenRequest(url)) {
    const refreshed = await refreshSessionOnce();
    if (refreshed) {
      response = await fetch(url, options);
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

export async function login(email: string, password: string): Promise<RoleName> {
  const response = await fetch(resolveApiUrl('/auth/login'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = (await response.json().catch(() => null)) as AuthResponse | null;

  await persistCookies(response);

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.data?.message ?? 'Request failed');
  }

  const role = await resolveRoleFromAuth(response);
  if (!role) {
    throw new Error('Login succeeded but roleName is missing from access token.');
  }

  return role;
}

export async function logout() {
  const response = await authFetch('/auth/logout', {
    method: 'DELETE',
  });

  await parseApiResponse(response);
  await clearAccessTokenCache();

  if (CookieManager) {
    await CookieManager.clearAll();
  }
}
