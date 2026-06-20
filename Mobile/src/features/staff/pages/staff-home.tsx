import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  StaffDarkCard,
  StaffDonutChart,
  StaffMetricGrid,
  StaffScreenHeader,
} from '@/features/staff/components/premium';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { getMyProfile, type UserProfile } from '@/lib/auth-api';
import { STAFF_ROUTES } from '@/roles';

export default function StaffHomeScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const { slotStats, todaySessionCount, isLoadingSlots, refreshWorkspace } = useStaffWorkspace();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshWorkspace().catch(() => undefined);
      void getMyProfile().then(setProfile).catch(() => setProfile(null));
    }, [refreshWorkspace]),
  );

  const occupancyPercent = useMemo(() => {
    if (slotStats.total === 0) {
      return 0;
    }
    return Math.round((slotStats.inUsed / slotStats.total) * 100);
  }, [slotStats.inUsed, slotStats.total]);

  const metrics = useMemo(
    () => [
      {
        id: 'available',
        icon: 'checkmark-circle-outline' as const,
        value: slotStats.available,
        label: t('Trống', 'Available'),
        tone: 'success' as const,
      },
      {
        id: 'occupied',
        icon: 'car-outline' as const,
        value: slotStats.inUsed,
        label: t('Đang gửi', 'Occupied'),
        tone: 'warning' as const,
      },
      {
        id: 'sessions',
        icon: 'time-outline' as const,
        value: todaySessionCount,
        label: t('Phiên hôm nay', 'Sessions today'),
        tone: 'info' as const,
      },
      {
        id: 'total',
        icon: 'grid-outline' as const,
        value: slotStats.total,
        label: t('Tổng ô', 'Total spots'),
        tone: 'default' as const,
      },
    ],
    [slotStats, t, todaySessionCount],
  );

  return (
    <StaffPageShell
      header={
        <StaffScreenHeader
          onProfilePress={() => router.push(STAFF_ROUTES.profile)}
          rightLabel={profile?.fullName?.split(' ')[0]}
          subtitle={t('Tổng quan bãi xe theo thời gian thực', 'Real-time lot overview')}
          title={t('Dashboard', 'Dashboard')}
        />
      }>
      <StaffDarkCard accentBorder="primary">
        {isLoadingSlots && slotStats.total === 0 ? (
          <ActivityIndicator color={DesignColors.primary} />
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <StaffDonutChart
              label={t('Đang chiếm', 'Occupied')}
              sublabel={`${slotStats.inUsed}/${slotStats.total} ${t('ô', 'spots')}`}
              value={occupancyPercent}
            />
          </View>
        )}
      </StaffDarkCard>

      <StaffDarkCard>
        <ThemedText style={{ color: DesignColors.inkMuted, fontSize: 12, marginBottom: 4 }}>
          {t('Tóm tắt nhanh', 'Quick summary')}
        </ThemedText>
        <StaffMetricGrid items={metrics} />
      </StaffDarkCard>

      <StaffDarkCard accentBorder="success">
        <ThemedText style={{ color: DesignColors.ink, fontWeight: '600', fontSize: 15 }}>
          {profile?.fullName ?? t('Nhân viên', 'Staff')}
        </ThemedText>
        <ThemedText style={{ color: DesignColors.inkMuted, fontSize: 13 }}>
          {profile?.phone ?? profile?.email ?? '—'}
        </ThemedText>
      </StaffDarkCard>
    </StaffPageShell>
  );
}
