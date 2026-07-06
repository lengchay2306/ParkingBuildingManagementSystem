import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

import { CUSTOMER_ROUTES, STAFF_ROUTES } from '@/roles';

const ROOT_TAB_PATHS = new Set<string>([
  CUSTOMER_ROUTES.home,
  CUSTOMER_ROUTES.parkingMap,
  CUSTOMER_ROUTES.reservations,
  CUSTOMER_ROUTES.profile,
  STAFF_ROUTES.home,
  STAFF_ROUTES.slots,
  STAFF_ROUTES.checkIn,
  STAFF_ROUTES.sessions,
]);

/**
 * On Android, prevent hardware back from popping authenticated users onto the login screen.
 * On root tab screens, exit the app instead.
 */
export function useAndroidAuthenticatedBack(isAuthenticated: boolean) {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'android' || !isAuthenticated) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!ROOT_TAB_PATHS.has(pathname)) {
        return false;
      }

      BackHandler.exitApp();
      return true;
    });

    return () => subscription.remove();
  }, [isAuthenticated, pathname]);
}
