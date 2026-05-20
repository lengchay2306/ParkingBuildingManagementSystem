import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { jwtDecode } from "jwt-decode";

const ROLE_STORAGE_KEY = "parkos-role";
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export const ROLE_TO_ROUTE = {
  STAFF: "/staff",
  MANAGER: "/manager",
  CUSTOMER: "/driver",
  ADMIN: "/admin",
} as const;

export type RoleName = keyof typeof ROLE_TO_ROUTE;

type AuthPayload = {
  status?: string;
  message?: string;
  data?: {
    message?: string;
    roleName?: string;
  };
};

type AccessTokenPayload = {
  roleName?: string;
};

const getRoleNameFromAccessCookie = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie("accessToken");
  if (!token) {
    return null;
  }
  try {
    const payload = jwtDecode<AccessTokenPayload>(token);
    return payload.roleName ?? null;
  } catch {
    return null;
  }
});


const normalizeRole = (value?: string | null): RoleName | null => {
  if (!value) {
    return null;
  }
  const upper = value.toUpperCase();
  return upper in ROLE_TO_ROUTE ? (upper as RoleName) : null;
};

const parseAuthResponse = async (response: Response): Promise<AuthPayload> => {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as AuthPayload;
  }
  return {};
};

export const getStoredRole = (): RoleName | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return normalizeRole(window.localStorage.getItem(ROLE_STORAGE_KEY));
};

export const setStoredRole = (role: RoleName | null) => {
  if (typeof window === "undefined") {
    return;
  }
  if (role) {
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
    return;
  }
  window.localStorage.removeItem(ROLE_STORAGE_KEY);
};

export const getRoleHome = (role: RoleName) => ROLE_TO_ROUTE[role];

export const login = async (email: string, password: string): Promise<RoleName> => {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const payload = await parseAuthResponse(response);
  if (!response.ok) {
    throw new Error(payload.data?.message || payload.message || "Login failed");
  }
  let role = normalizeRole(payload.data?.roleName);
  if (!role) {
    const roleFromToken = await getRoleNameFromAccessCookie();
    role = normalizeRole(roleFromToken);
  }
  if (!role) {
    throw new Error(
      "Login success nhưng không đọc được roleName từ response/cookie. Kiem tra backend cookie secure tren localhost.",
    );
  }
  setStoredRole(role);
  return role;
};

export const refreshSession = async (): Promise<RoleName | null> => {
  const response = await fetch(`${API_BASE}/api/v1/auth/refresh-token`, {
    method: "POST",
    credentials: "include",
  });
  if (response.status === 400 || response.status === 401) {
    setStoredRole(null);
    return null;
  }
  const payload = await parseAuthResponse(response);
  if (!response.ok) {
    throw new Error(payload.data?.message || payload.message || "Refresh token failed");
  }
  let role = normalizeRole(payload.data?.roleName);
  if (!role) {
    const roleFromToken = await getRoleNameFromAccessCookie();
    role = normalizeRole(roleFromToken);
  }
  if (!role) {
    throw new Error("Refresh token succeeded but roleName is missing in both response and token.");
  }
  setStoredRole(role);
  return role;
};

export const logout = async () => {
  const response = await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: "DELETE",
    credentials: "include",
  });
  const payload = await parseAuthResponse(response);
  setStoredRole(null);
  if (!response.ok && response.status !== 401) {
    throw new Error(payload.data?.message || payload.message || "Logout failed");
  }
};

export const requireGuest = async () => {
  if (typeof window === "undefined") {
    return;
  }
  const stored = getStoredRole();
  if (stored) {
    throw redirect({ to: getRoleHome(stored) });
  }
  const roleFromToken = normalizeRole(await getRoleNameFromAccessCookie());
  if (roleFromToken) {
    setStoredRole(roleFromToken);
    throw redirect({ to: getRoleHome(roleFromToken) });
  }
};

export const requireRole = async (required: RoleName) => {
  if (typeof window === "undefined") {
    return required;
  }
  const stored = getStoredRole();
  if (stored) {
    if (stored !== required) {
      throw redirect({ to: getRoleHome(stored) });
    }
    return stored;
  }
  const roleFromToken = normalizeRole(await getRoleNameFromAccessCookie());
  if (roleFromToken) {
    setStoredRole(roleFromToken);
    if (roleFromToken !== required) {
      throw redirect({ to: getRoleHome(roleFromToken) });
    }
    return roleFromToken;
  }
  let refreshed: RoleName | null = null;
  try {
    refreshed = await refreshSession();
  } catch {
    setStoredRole(null);
    throw redirect({ to: "/login" });
  }
  if (!refreshed) {
    throw redirect({ to: "/login" });
  }
  if (refreshed !== required) {
    throw redirect({ to: getRoleHome(refreshed) });
  }
  return refreshed;
};
