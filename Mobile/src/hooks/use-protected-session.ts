import { useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { getRoleHome, type RoleName } from '@/lib/auth';
import { refreshSession } from '@/lib/auth-api';

/**
 * Keeps the session alive on protected screens: refresh when the screen is focused
 * or the app returns to foreground; redirect to auth if refresh fails.
 */
export function useProtectedSession() {
  const router = useRouter();

  const syncSession = useCallback(async () => {
    const role = await refreshSession();
    if (!role) {
      router.replace('/sign-platform' as never);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      syncSession();

      const onAppStateChange = (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          syncSession();
        }
      };

      const subscription = AppState.addEventListener('change', onAppStateChange);
      return () => subscription.remove();
    }, [syncSession]),
  );
}

/** Redirects guests to sign-in and wrong roles to their role home. */
export function useRequireRole(required: RoleName) {
  const router = useRouter();

  const syncSession = useCallback(async () => {
    const role = await refreshSession();
    if (!role) {
      router.replace('/sign-platform' as never);
      return;
    }
    if (role !== required) {
      router.replace(getRoleHome(role) as never);
    }
  }, [required, router]);

  useFocusEffect(
    useCallback(() => {
      syncSession();

      const onAppStateChange = (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          syncSession();
        }
      };

      const subscription = AppState.addEventListener('change', onAppStateChange);
      return () => subscription.remove();
    }, [syncSession]),
  );
}
