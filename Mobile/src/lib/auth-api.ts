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

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

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

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
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

export async function refreshSession() {
  const response = await fetch(`${API_URL}/auth/refresh-token`, {
    method: 'POST',
    credentials: 'include',
  });

  await persistCookies(response);
  await parseApiResponse(response);
  return true;
}

export async function logout() {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'DELETE',
    credentials: 'include',
  });

  await parseApiResponse(response);

  if (CookieManager) {
    await CookieManager.clearAll();
  }
}
