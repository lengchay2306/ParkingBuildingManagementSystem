import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  StaffFilterPills,
  StaffScreenHeader,
  StaffSessionRow,
  type StaffFilterOption,
} from '@/features/staff/components/premium';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import type { StaffCheckInRecord } from '@/features/staff/lib/utils';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { staffSessionDetailPath } from '@/roles';

type SessionFilter = 'ALL' | 'ACTIVE' | 'COMPLETED';

export default function StaffSessionsScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const { recentCheckIns, isLoadingSlots, loadParkingSlots } = useStaffWorkspace();
  const [filter, setFilter] = useState<SessionFilter>('ALL');

  useFocusEffect(
    useCallback(() => {
      void loadParkingSlots();
    }, [loadParkingSlots]),
  );

  const filterOptions = useMemo<StaffFilterOption<SessionFilter>[]>(
    () => [
      { id: 'ALL', label: t('Tất cả', 'All') },
      { id: 'ACTIVE', label: t('Đang hoạt động', 'Active') },
      { id: 'COMPLETED', label: t('Đã kết thúc', 'Completed') },
    ],
    [t],
  );

  const filteredSessions = useMemo(() => {
    return recentCheckIns.filter((session) => {
      if (filter === 'ALL') {
        return true;
      }
      if (filter === 'ACTIVE') {
        return session.status.toUpperCase() === 'ACTIVE';
      }
      return session.status.toUpperCase() !== 'ACTIVE';
    });
  }, [filter, recentCheckIns]);

  const openSession = useCallback(
    (session: StaffCheckInRecord) => {
      router.push(staffSessionDetailPath(session.id) as Href);
    },
    [router],
  );

  return (
    <StaffPageShell
      header={
        <StaffScreenHeader
          subtitle={t('Phiên gửi xe đang hoạt động và gần đây', 'Active and recent parking sessions')}
          title={t('Sessions', 'Sessions')}
        />
      }>
      <StaffFilterPills onChange={setFilter} options={filterOptions} value={filter} />

      {isLoadingSlots ? (
        <ActivityIndicator color={DesignColors.primary} style={{ marginTop: 24 }} />
      ) : filteredSessions.length === 0 ? (
        <ThemedText style={{ color: DesignColors.inkMuted, textAlign: 'center', marginTop: 24 }}>
          {t('Chưa có phiên nào. Check-in xe để bắt đầu.', 'No sessions yet. Check in a vehicle to start.')}
        </ThemedText>
      ) : (
        <View style={{ gap: 10 }}>
          {filteredSessions.map((session) => (
            <StaffSessionRow
              key={session.id}
              onPress={() => openSession(session)}
              plate={session.plate}
              slotLabel={session.slotLabel}
              status={session.status}
              timeLabel={session.timeLabel}
            />
          ))}
        </View>
      )}
    </StaffPageShell>
  );
}
