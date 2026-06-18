import { Redirect, type Href } from 'expo-router';

export default function StaffOperationsRedirect() {
  return <Redirect href={'/staff-sessions' as Href} />;
}
