import { Redirect } from 'expo-router';

import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { STAFF_ROUTES } from '@/roles';

/** Settings live on the Staff tab now — keep this route as a redirect for old links. */
export default function StaffSettingsScreen() {
  useStaffRoleGuard();
  return <Redirect href={STAFF_ROUTES.profile as never} />;
}
