/** Expo Router paths (route groups like `(customer)` are omitted from URLs). */
export const AUTH_ROUTES = {
  signIn: '/sign-platform',
} as const;

export const CUSTOMER_ROUTES = {
  home: '/home',
  parkingMap: '/parking-map',
  reservations: '/reservations',
  profile: '/profile',
  settings: '/settings',
  driver: '/driver',
  paymentReturn: '/payment/return',
  paymentCancel: '/payment/cancel',
} as const;

export const STAFF_ROUTES = {
  home: '/staff-home',
  scan: '/staff-scan',
  /** @deprecated Alias for scan — check-in merged into scan tab. */
  checkIn: '/staff-scan',
  slots: '/staff-slots',
  slotDetail: '/staff-slots/[slotId]',
  /** Session detail nested under Spots (Back → slot). */
  slotSessionDetail: '/staff-slots/session/[sessionId]',
  sessions: '/staff-sessions',
  sessionDetail: '/staff-sessions/[sessionId]',
  operations: '/staff-operations',
  profile: '/staff-profile',
  settings: '/staff-settings',
  /** Legacy alias — redirects to home. */
  legacy: '/staff',
} as const;

export function staffSlotDetailPath(slotId: string) {
  return `/staff-slots/${slotId}` as const;
}

/** Open a session from Spots without leaving the slots tab stack. */
export function staffSlotSessionDetailPath(sessionId: string) {
  return `/staff-slots/session/${sessionId}` as const;
}

export function staffSessionDetailPath(sessionId: string) {
  return `/staff-sessions/${sessionId}` as const;
}

export const ROLE_ROUTES = {
  auth: AUTH_ROUTES,
  customer: CUSTOMER_ROUTES,
  staff: STAFF_ROUTES,
} as const;

/** Default landing route after login for each mobile role. */
export type PostLoginRoute =
  | typeof CUSTOMER_ROUTES.home
  | typeof STAFF_ROUTES.home;
