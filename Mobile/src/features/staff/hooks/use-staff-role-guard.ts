import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useProtectedSession } from '@/hooks/use-protected-session';
import { useSessionRole } from '@/hooks/session-role';
import { resolveRoleAfterLogin } from '@/lib/auth-api';
import { CUSTOMER_ROUTES, normalizeAppRole } from '@/roles';

/** Redirect non-staff users away from staff screens. */
export function useStaffRoleGuard() {
  const router = useRouter();
  const { isLoading: isRoleLoading } = useSessionRole();
  useProtectedSession();

  useEffect(() => {
    if (isRoleLoading) {
      return;
    }

    let isMounted = true;

    async function verifyRole() {
      const roleName = await resolveRoleAfterLogin();
      if (!isMounted) {
        return;
      }
      if (normalizeAppRole(roleName) !== 'STAFF') {
        router.replace(CUSTOMER_ROUTES.home as never);
      }
    }

    void verifyRole();

    return () => {
      isMounted = false;
    };
  }, [isRoleLoading, router]);
}
