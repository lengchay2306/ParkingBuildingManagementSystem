export { APP_ROLES, isAppRole, normalizeAppRole, type AppRole } from '@/roles/types';
export {
  AUTH_ROUTES,
  CUSTOMER_ROUTES,
  ROLE_ROUTES,
  STAFF_ROUTES,
  staffSlotDetailPath,
  staffSlotSessionDetailPath,
  staffSessionDetailPath,
  type PostLoginRoute,
} from '@/roles/routes';
export { resolvePostLoginRoute, resolveRoleLabel, roleHomeRoute } from '@/roles/navigation';
