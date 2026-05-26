import { useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { refreshSession } from '@/lib/auth-api';

/**
 * Keeps the session alive on protected screens: refresh when the screen is focused
 * or the app returns to foreground; redirect to login if refresh fails.
 */
export function useProtectedSession() {
  const router = useRouter();

  const syncSession = useCallback(async () => {
    const isValid = await refreshSession();
    if (!isValid) {
      router.replace('/login' as never);
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
