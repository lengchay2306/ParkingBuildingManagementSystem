/** Mobile app roles — Admin/Manager use the web FE, not this app. */
export const APP_ROLES = ['STAFF', 'CUSTOMER'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: string | null | undefined): value is AppRole {
  if (!value) {
    return false;
  }
  return (APP_ROLES as readonly string[]).includes(value.toUpperCase());
}

export function normalizeAppRole(value: string | null | undefined): AppRole | null {
  if (!value) {
    return null;
  }
  const upper = value.toUpperCase();
  return isAppRole(upper) ? upper : null;
}
