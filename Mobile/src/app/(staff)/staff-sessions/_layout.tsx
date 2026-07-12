import { Stack } from 'expo-router';

import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';

export default function StaffSessionsLayout() {
  const DesignColors = useStaffDesignColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DesignColors.canvas },
      }}
    />
  );
}
