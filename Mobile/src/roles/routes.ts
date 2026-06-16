/** Expo Router paths (route groups like `(customer)` are omitted from URLs). */
export const AUTH_ROUTES = {
  signIn: '/sign-platform',
} as const;

export const CUSTOMER_ROUTES = {
  home: '/home_check1',
  homeAlt: '/home_check2',
  parkingMap: '/parking-map',
  reservations: '/reservations',
  profile: '/profile',
  settings: '/settings',
  driver: '/driver',
} as const;

export const STAFF_ROUTES = {
  home: '/staff',
} as const;

export const MANAGER_ROUTES = {
  home: '/manager',
} as const;

export const ADMIN_ROUTES = {
  home: '/admin',
  dashboard: '/dashboard',
} as const;

export const ROLE_ROUTES = {
  auth: AUTH_ROUTES,
  customer: CUSTOMER_ROUTES,
  staff: STAFF_ROUTES,
  manager: MANAGER_ROUTES,
  admin: ADMIN_ROUTES,
} as const;

/** Default landing route after login for each role. */
export type PostLoginRoute =
  | typeof CUSTOMER_ROUTES.home
  | typeof STAFF_ROUTES.home
  | typeof MANAGER_ROUTES.home
  | typeof ADMIN_ROUTES.home;
