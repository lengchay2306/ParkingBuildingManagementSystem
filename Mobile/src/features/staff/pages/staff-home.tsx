import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StaffCheckInList } from '@/features/staff/components/staff-check-in-list';
import { StaffNavCard } from '@/features/staff/components/staff-nav-card';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { StaffSlotStats } from '@/features/staff/components/staff-slot-stats';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { getMyProfile, type UserProfile } from '@/lib/auth-api';
import { STAFF_ROUTES } from '@/roles';

export default function StaffHomeScreen() {
  useStaffRoleGuard();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const { slotStats, recentCheckIns, isLoadingSlots, loadParkingSlots } = useStaffWorkspace();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadParkingSlots();
      void getMyProfile().then(setProfile).catch(() => setProfile(null));
    }, [loadParkingSlots]),
  );

  return (
    <StaffPageShell
      eyebrow={t('Nhân viên bãi', 'Parking staff')}
      title={t('Trang chủ tuần tra', 'Patrol home')}
      subtitle={t(
        'Tổng quan bãi xe và lối tắt tới các tác vụ hàng ngày.',
        'Lot overview and shortcuts to daily tasks.',
      )}>
      <View style={styles.card}>
        <ThemedText style={styles.eyebrow}>{t('Ca làm việc', 'Shift')}</ThemedText>
        <ThemedText style={styles.sessionPlate}>
          {profile?.fullName ?? t('Nhân viên', 'Staff')}
        </ThemedText>
        <ThemedText style={styles.sessionDetail}>
          {profile?.phone ?? profile?.email ?? '—'}
        </ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.eyebrow}>{t('Trạng thái bãi', 'Lot status')}</ThemedText>
        {isLoadingSlots ? (
          <ActivityIndicator color={DesignColors.accentViolet} />
        ) : (
          <StaffSlotStats
            available={slotStats.available}
            inUsed={slotStats.inUsed}
            total={slotStats.total}
            labels={{
              available: t('Trống', 'Available'),
              inUsed: t('Đang gửi', 'In use'),
              total: t('Tổng', 'Total'),
            }}
          />
        )}
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.eyebrow}>{t('Lối tắt', 'Shortcuts')}</ThemedText>
        <StaffNavCard
          href={STAFF_ROUTES.checkIn}
          meta={t('Tra cứu xe + check-in', 'Lookup + check in')}
          title={t('Check-in', 'Check in')}
        />
        <StaffNavCard
          href={STAFF_ROUTES.slots}
          meta={t('Xem từng tầng và ô', 'View floors and slots')}
          title={t('Bãi xe', 'Parking lot')}
        />
        <StaffNavCard
          href={STAFF_ROUTES.operations}
          meta={t('Ra cổng, đặt chỗ, ngoại lệ', 'Exit, reservations, exceptions')}
          title={t('Tác vụ', 'Operations')}
        />
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.eyebrow}>{t('Check-in gần đây', 'Recent check-ins')}</ThemedText>
        <StaffCheckInList
          emptyMessage={t(
            'Chưa có check-in trong phiên này.',
            'No check-ins in this session yet.',
          )}
          items={recentCheckIns}
          styles={styles}
        />
      </View>
    </StaffPageShell>
  );
}
