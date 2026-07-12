import { Redirect } from 'expo-router';

import { STAFF_ROUTES } from '@/roles';

/** Legacy route — check-in is merged into the scan tab. */
export default function StaffCheckInRedirect() {
  return <Redirect href={STAFF_ROUTES.scan} />;
}
