import { Platform } from 'react-native';

type AuthResponse = {
  status: string;
  data?: {
    message?: string;
  };
  message?: string;
};

const fallbackApiUrl = Platform.select({
  ios: 'http://192.168.100.24:3000/api/v1',
  android: 'http://192.168.100.24:3000/api/v1',
  web: 'http://localhost:3000/api/v1',
  default: 'http://localhost:3000/api/v1',
});

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? fallbackApiUrl;

async function parseApiResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as AuthResponse | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.data?.message ?? 'Request failed');
  }

  return payload;
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

  return parseApiResponse(response);
}

export async function logout() {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'DELETE',
    credentials: 'include',
  });

  await parseApiResponse(response);
}
