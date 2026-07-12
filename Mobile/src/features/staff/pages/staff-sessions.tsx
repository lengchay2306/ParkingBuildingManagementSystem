import { StackActions } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  StaffFilterPills,
  StaffScreenHeader,
  StaffSessionRow,
  type StaffFilterOption,
} from '@/features/staff/components/premium';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { StaffLoadingReveal } from '@/features/staff/components/staff-loading-lottie';
import { StaffTextInput } from '@/features/staff/components/staff-text-input';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useStaffScreenTitles } from '@/features/staff/lib/staff-screen-titles';
import type { StaffCheckInRecord } from '@/features/staff/lib/utils';
import { todayDateParam } from '@/features/staff/lib/utils';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { StaffFadeIn } from '@/features/staff/motion/staff-motion';
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

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + deltaDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(dateKey: string, t: (vi: string, en: string) => string): string {
  const today = todayDateParam();
  if (dateKey === today) {
    return t('Hôm nay', 'Today');
  }
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function StaffSessionsScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useLanguagePreference();
  const titles = useStaffScreenTitles();
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const {
    parkingSessions,
    isLoadingSessions,
    sessionsError,
    loadParkingSessions,
    refreshWorkspace,
  } = useStaffWorkspace();
  const [filter, setFilter] = useState<SessionFilter>('ALL');
  const [sessionDate, setSessionDate] = useState(todayDateParam());
  const [plateSearch, setPlateSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reloadSessions = useCallback(
    async (nextFilter: SessionFilter = filter, date: string = sessionDate) => {
      await loadParkingSessions({ status: resolveStatusQuery(nextFilter), date });
    },
    [filter, loadParkingSessions, sessionDate],
  );

  useFocusEffect(
    useCallback(() => {
      void reloadSessions(filter, sessionDate);
    }, [filter, reloadSessions, sessionDate]),
  );

  useFocusEffect(
    useCallback(() => {
      const tabNavigation = navigation.getParent();
      if (!tabNavigation) {
        return undefined;
      }

      const unsubscribe = (
        tabNavigation as { addListener: (event: 'tabPress', callback: () => void) => () => void }
      ).addListener('tabPress', () => {
        const stackState = navigation.getState();
        if (stackState && stackState.index > 0) {
          navigation.dispatch(StackActions.popToTop());
        }
      });

      return unsubscribe;
    }, [navigation]),
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
      void loadParkingSessions({ status: resolveStatusQuery(next), date: sessionDate });
    },
    [loadParkingSessions, sessionDate],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshWorkspace({ status: resolveStatusQuery(filter), date: sessionDate });
    } finally {
      setIsRefreshing(false);
    }
  }, [filter, refreshWorkspace, sessionDate]);

  const filteredSessions = useMemo(() => {
    const query = plateSearch.trim().toUpperCase();
    if (!query) {
      return parkingSessions;
    }
    return parkingSessions.filter((session) => session.plate.toUpperCase().includes(query));
  }, [parkingSessions, plateSearch]);

  const openSession = useCallback(
    (session: StaffCheckInRecord) => {
      router.push(staffSessionDetailPath(session.id) as Href);
    },
    [router],
  );

  const isToday = sessionDate === todayDateParam();

  return (
    <StaffPageShell
      header={<StaffScreenHeader title={titles.sessions} />}
      onRefresh={() => void handleRefresh()}
      refreshing={isRefreshing}>
      <StaffActionButton
        compact
        label={t('Ra cổng', 'Checkout')}
        onPress={() => router.push(STAFF_ROUTES.operations as never)}
        style={styles.fullWidthButton}
        variant="secondary"
      />

      <View style={styles.dateNavRow}>
        <Pressable
          hitSlop={6}
          onPress={() => {
            const next = shiftDateKey(sessionDate, -1);
            setSessionDate(next);
            void loadParkingSessions({ status: resolveStatusQuery(filter), date: next });
          }}
          style={({ pressed }) => [styles.dateNavBtn, pressed && styles.buttonPressed]}>
          <ThemedText style={styles.dateNavBtnText}>‹</ThemedText>
        </Pressable>
        <View style={styles.dateNavCenter}>
          <ThemedText style={styles.dateNavLabel}>{formatDateLabel(sessionDate, t)}</ThemedText>
          <ThemedText style={styles.dateNavMeta}>{sessionDate}</ThemedText>
        </View>
        <Pressable
          hitSlop={6}
          onPress={() => {
            const next = shiftDateKey(sessionDate, 1);
            setSessionDate(next);
            void loadParkingSessions({ status: resolveStatusQuery(filter), date: next });
          }}
          style={({ pressed }) => [styles.dateNavBtn, pressed && styles.buttonPressed]}>
          <ThemedText style={styles.dateNavBtnText}>›</ThemedText>
        </Pressable>
        {!isToday ? (
          <Pressable
            hitSlop={6}
            onPress={() => {
              const today = todayDateParam();
              setSessionDate(today);
              void loadParkingSessions({ status: resolveStatusQuery(filter), date: today });
            }}
            style={({ pressed }) => [styles.dateTodayBtn, pressed && styles.buttonPressed]}>
            <ThemedText style={styles.dateTodayBtnText}>{t('Hôm nay', 'Today')}</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <StaffTextInput
        autoCapitalize="characters"
        onChangeText={setPlateSearch}
        placeholder={t('Tìm biển số...', 'Search plate...')}
        value={plateSearch}
      />

      <StaffFilterPills onChange={handleFilterChange} options={filterOptions} value={filter} />

      <StaffLoadingReveal
        loading={isLoadingSessions && parkingSessions.length === 0}
        loadingStyle={styles.loadingIndicator}
        size={120}>
        {sessionsError && parkingSessions.length === 0 ? (
          <View style={styles.card}>
            <ThemedText style={styles.hint}>{sessionsError}</ThemedText>
            <StaffActionButton
              label={t('Thử lại', 'Retry')}
              onPress={() => void reloadSessions(filter, sessionDate)}
              style={styles.fullWidthButton}
              variant="secondary"
            />
          </View>
        ) : filteredSessions.length === 0 ? (
          <ThemedText style={styles.emptyState}>
            {plateSearch.trim()
              ? t('Không có phiên khớp biển số.', 'No sessions match this plate.')
              : t('Chưa có phiên nào trong ngày này.', 'No sessions on this date yet.')}
          </ThemedText>
        ) : (
          <View style={styles.sessionList}>
            {filteredSessions.map((session, index) => (
              <StaffFadeIn index={index} key={session.id}>
                <StaffSessionRow
                  onPress={() => openSession(session)}
                  plate={session.plate}
                  slotLabel={session.slotLabel}
                  status={session.status}
                  timeLabel={session.timeLabel}
                />
              </StaffFadeIn>
            ))}
          </View>
        )}
      </StaffLoadingReveal>
    </StaffPageShell>
  );
}
