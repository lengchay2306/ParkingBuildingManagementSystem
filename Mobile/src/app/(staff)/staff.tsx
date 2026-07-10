import { Redirect } from "expo-router";

import { STAFF_ROUTES } from "@/roles";

export default function StaffLegacyRedirect() {
  return <Redirect href={STAFF_ROUTES.home} />;
}
