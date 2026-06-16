export { APP_ROLES, isAppRole, normalizeAppRole, type AppRole } from '@/roles/types';
export {
  ADMIN_ROUTES,
  AUTH_ROUTES,
  CUSTOMER_ROUTES,
  MANAGER_ROUTES,
  ROLE_ROUTES,
  STAFF_ROUTES,
  type PostLoginRoute,
} from '@/roles/routes';
export { resolvePostLoginRoute, resolveRoleLabel, roleHomeRoute } from '@/roles/navigation';
