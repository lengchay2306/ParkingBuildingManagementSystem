import { refreshSession } from "@/lib/auth";

let refreshInFlight: Promise<boolean> | null = null;

function isRefreshTokenRequest(url: string): boolean {
  return url.includes("/auth/refresh-token");
}

function refreshSessionOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshSession()
      .then((role) => role !== null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Authenticated fetch: sends cookies and retries once after refreshing the session on 401.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const credentials = init.credentials ?? "include";
  let response = await fetch(input, { ...init, credentials });

  if (typeof window === "undefined") {
    return response;
  }

  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  if (response.status === 401 && !isRefreshTokenRequest(url)) {
    const refreshed = await refreshSessionOnce();
    if (refreshed) {
      response = await fetch(input, { ...init, credentials });
    }
  }

  return response;
}
