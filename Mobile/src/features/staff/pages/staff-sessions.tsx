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
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { createStaffStyles } from '@/features/staff/styles/common';
import type { StaffCheckInRecord } from '@/features/staff/lib/utils';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { STAFF_ROUTES, staffSessionDetailPath } from '@/roles';

type SessionFilter = 'ALL' | 'ACTIVE' | 'COMPLETED';

function resolveStatusQuery(filter: SessionFilter): 'ACTIVE' | 'COMPLETED' | undefined {
  if (filter === 'ACTIVE') {
    return 'ACTIVE';
  }
  if (filter === 'COMPLETED') {
    return 'COMPLETED';
  }
  return undefined;
}

export default function StaffSessionsScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const {
    parkingSessions,
    isLoadingSessions,
    sessionsError,
    loadParkingSessions,
    refreshWorkspace,
  } = useStaffWorkspace();
  const [filter, setFilter] = useState<SessionFilter>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reloadSessions = useCallback(
    async (nextFilter: SessionFilter = filter) => {
      await loadParkingSessions({ status: resolveStatusQuery(nextFilter) });
    },
    [filter, loadParkingSessions],
  );

  useFocusEffect(
    useCallback(() => {
      void reloadSessions(filter);
    }, [filter, reloadSessions]),
  );

  const filterOptions = useMemo<StaffFilterOption<SessionFilter>[]>(
    () => [
      { id: 'ALL', label: t('Tất cả', 'All') },
      { id: 'ACTIVE', label: t('Đang hoạt động', 'Active') },
      { id: 'COMPLETED', label: t('Đã kết thúc', 'Completed') },
    ],
    [t],
  );

  const handleFilterChange = useCallback(
    (next: SessionFilter) => {
      setFilter(next);
      void loadParkingSessions({ status: resolveStatusQuery(next) });
    },
    [loadParkingSessions],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshWorkspace({ status: resolveStatusQuery(filter) });
    } finally {
      setIsRefreshing(false);
    }
  }, [filter, refreshWorkspace]);

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
          subtitle={t('Phiên gửi xe hôm nay từ hệ thống', "Today's sessions from the system")}
          title={t('Sessions', 'Sessions')}
        />
      }
      onRefresh={() => void handleRefresh()}
      refreshing={isRefreshing}>
      <StaffActionButton
        compact
        label={t('Ra cổng & ngoại lệ', 'Exit & exceptions')}
        onPress={() => router.push(STAFF_ROUTES.operations as never)}
        style={styles.fullWidthButton}
        variant="secondary"
      />

      <StaffFilterPills onChange={handleFilterChange} options={filterOptions} value={filter} />

      {isLoadingSessions && parkingSessions.length === 0 ? (
        <ActivityIndicator color={DesignColors.primary} style={{ marginTop: 24 }} />
      ) : sessionsError && parkingSessions.length === 0 ? (
        <View style={styles.card}>
          <ThemedText style={styles.hint}>{sessionsError}</ThemedText>
          <StaffActionButton
            label={t('Thử lại', 'Retry')}
            onPress={() => void reloadSessions(filter)}
            style={styles.fullWidthButton}
            variant="secondary"
          />
        </View>
      ) : parkingSessions.length === 0 ? (
        <ThemedText style={{ color: DesignColors.inkMuted, textAlign: 'center', marginTop: 24 }}>
          {t('Chưa có phiên nào hôm nay.', 'No sessions for today yet.')}
        </ThemedText>
      ) : (
        <View style={{ gap: 10 }}>
          {parkingSessions.map((session) => (
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
