import { useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";

import { getStoredPostLoginRoute, refreshSession, resolveRoleAfterLogin } from "@/lib/auth-api";
import { resolvePostLoginRoute } from "@/roles";

/**
 * Auth screens only: if the session is still valid, redirect to the role home
 * instead of showing login (e.g. after Android hardware back from a tab).
 */
export function useGuestOnlySession() {
  const router = useRouter();

  const redirectIfAuthenticated = useCallback(async () => {
    const isValid = await refreshSession();
    if (!isValid) {
      return;
    }

    try {
      const role = await resolveRoleAfterLogin();
      router.replace(resolvePostLoginRoute(role) as never);
    } catch {
      const route = await getStoredPostLoginRoute();
      router.replace(route as never);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void redirectIfAuthenticated();
    }, [redirectIfAuthenticated]),
  );
}
