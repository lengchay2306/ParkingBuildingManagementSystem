import { Platform } from 'react-native';

type CookieManagerType = {
  setFromResponse: (url: string, cookie: string) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
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
  };
  message?: string;
};

const AUTH_REFRESH_PATH = '/auth/refresh-token';

const fallbackApiUrl = Platform.select({
  ios: 'http://192.168.100.24:3000/api/v1',
  android: 'http://192.168.100.24:3000/api/v1',
  web: 'http://localhost:3000/api/v1',
  default: 'http://localhost:3000/api/v1',
});

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? fallbackApiUrl;

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

async function persistCookies(response: Response) {
  if (!CookieManager) {
    return;
  }
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    return;
  }
  await CookieManager.setFromResponse(response.url, setCookie);
}

async function requestRefreshToken(): Promise<boolean> {
  const response = await fetch(resolveApiUrl(AUTH_REFRESH_PATH), {
    method: 'POST',
    credentials: 'include',
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

export async function login(email: string, password: string) {
  const response = await fetch(resolveApiUrl('/auth/login'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  await persistCookies(response);
  return parseApiResponse(response);
}

export async function logout() {
  const response = await authFetch('/auth/logout', {
    method: 'DELETE',
  });

  await parseApiResponse(response);

  if (CookieManager) {
    await CookieManager.clearAll();
  }
}
