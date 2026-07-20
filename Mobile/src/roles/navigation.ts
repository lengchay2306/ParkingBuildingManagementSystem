import type { AppRole } from '@/roles/types';
import { normalizeAppRole } from '@/roles/types';
import {
  CUSTOMER_ROUTES,
  STAFF_ROUTES,
  type PostLoginRoute,
} from '@/roles/routes';

export function resolvePostLoginRoute(roleName: string | null): PostLoginRoute {
  const role = normalizeAppRole(roleName);
  if (role === 'STAFF') {
    return STAFF_ROUTES.home;
  }
  return CUSTOMER_ROUTES.home;
}

export function resolveRoleLabel(
  roleName: string | null,
  t: (vi: string, en: string) => string,
): string {
  const role = normalizeAppRole(roleName);
  if (role === 'CUSTOMER') {
    return t('Khách hàng', 'Customer');
  }
  if (role === 'STAFF') {
    return t('Nhân viên', 'Staff');
  }
  return roleName ?? '—';
}

export function roleHomeRoute(role: AppRole): PostLoginRoute {
  return resolvePostLoginRoute(role);
}
