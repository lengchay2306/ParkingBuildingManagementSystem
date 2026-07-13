import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import {
  StaffDarkCard,
  StaffDonutChart,
  StaffMetricGrid,
} from '@/features/staff/components/premium';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { StaffLoadingReveal } from '@/features/staff/components/staff-loading-lottie';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { useStaffScreenTitles } from '@/features/staff/lib/staff-screen-titles';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useLanguagePreference } from '@/hooks/language-preference';
import { resolveApiErrorMessage } from '@/lib/api-error';

export default function StaffHomeScreen() {
  useStaffRoleGuard();
  const { t } = useLanguagePreference();
  const { showToast } = useAppToast();
  const titles = useStaffScreenTitles();
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const { slotStats, todaySessionCount, isLoadingSlots, refreshWorkspace } = useStaffWorkspace();

  useFocusEffect(
    useCallback(() => {
      void refreshWorkspace().catch((error) => {
        showToast(
          resolveApiErrorMessage(
            error,
            t('Không tải được dữ liệu bãi', 'Could not load lot data'),
          ),
          'error',
        );
      });
    }, [refreshWorkspace, showToast, t]),
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
    <StaffPageShell title={titles.dashboard}>
      <StaffDarkCard accentBorder="primary" index={0}>
        <StaffLoadingReveal loading={isLoadingSlots && slotStats.total === 0} size={120}>
          <View style={styles.chartWrap}>
            <StaffDonutChart
              label={t('Đang chiếm', 'Occupied')}
              sublabel={`${slotStats.inUsed}/${slotStats.total} ${t('ô', 'spots')}`}
              tone="occupied"
              value={occupancyPercent}
            />
          </View>
        </StaffLoadingReveal>
      </StaffDarkCard>

      <StaffDarkCard index={1}>
        <ThemedText style={[styles.sectionLabel, { color: DesignColors.ink }]}>
          {t('Tóm tắt nhanh', 'Quick summary')}
        </ThemedText>
        <StaffMetricGrid items={metrics} />
      </StaffDarkCard>
    </StaffPageShell>
  );
}
