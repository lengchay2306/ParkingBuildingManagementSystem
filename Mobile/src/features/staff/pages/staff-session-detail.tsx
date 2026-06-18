import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, Typography } from '@/constants/design';
import {
  StaffSessionDetailGrid,
  StaffStatusBadge,
  type StaffDetailCell,
} from '@/features/staff/components/premium';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import {
  estimateSessionCost,
  formatDurationFrom,
  formatTimeLabel,
} from '@/features/staff/lib/utils';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

export default function StaffSessionDetailScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const { recentCheckIns } = useStaffWorkspace();

  const session = useMemo(
    () => recentCheckIns.find((item) => item.id === sessionId) ?? null,
    [recentCheckIns, sessionId],
  );

  const isActive = session?.status.toUpperCase() === 'ACTIVE';

  const detailCells = useMemo<StaffDetailCell[]>(() => {
    if (!session) {
      return [];
    }
    const [spot = '—', floor = '—'] = session.slotLabel.split(' · ');
    const spotValue = floor !== '—' ? `${spot} · ${floor}` : spot;
    return [
      {
        id: 'spot',
        icon: 'location-outline' as const,
        label: t('Ô gửi', 'Spot'),
        value: spotValue,
      },
      {
        id: 'vehicle',
        icon: 'car-outline' as const,
        label: t('Loại xe', 'Vehicle'),
        value: session.vehicleType ?? t('Chưa rõ', 'Unknown'),
      },
      {
        id: 'entry',
        icon: 'log-in-outline' as const,
        label: t('Giờ vào', 'Entry'),
        value: session.timeLabel,
      },
      {
        id: 'duration',
        icon: 'time-outline' as const,
        label: t('Thời lượng', 'Duration'),
        value: formatDurationFrom(session.checkInTime),
      },
    ];
  }, [session, t]);

  useLayoutEffect(() => {
    navigation.setOptions({ animation: 'none' });
  }, [navigation]);

  const hideTabBar = useCallback(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
  }, [navigation]);

  const restoreTabBar = useCallback(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  useEffect(() => {
    hideTabBar();
    return restoreTabBar;
  }, [hideTabBar, restoreTabBar]);

  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.content, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={styles.back}>{t('← Quay lại', '← Back')}</ThemedText>
          </Pressable>
          <ThemedText style={styles.missing}>
            {t('Không tìm thấy phiên gửi xe.', 'Parking session not found.')}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.8 }}>
          <ThemedText style={styles.back}>{t('← Quay lại', '← Back')}</ThemedText>
        </Pressable>

        <View style={styles.headerCapsule}>
          <ThemedText style={styles.plate}>{session.plate}</ThemedText>
          <StaffStatusBadge label={session.status} tone={isActive ? 'active' : 'exited'} />
        </View>

        <StaffSessionDetailGrid cells={detailCells} />

        <View style={styles.costDivider} />
        <ThemedText style={styles.costLabel}>{t('Chi phí hiện tại', 'Current Cost')}</ThemedText>
        <ThemedText style={styles.costValue}>
          {estimateSessionCost(session.checkInTime)}
        </ThemedText>
        <ThemedText style={styles.costMeta}>
          {t('Loại phiên', 'Session type')}: {session.sessionType ?? 'DAILY'} ·{' '}
          {formatTimeLabel(session.checkInTime ?? '')}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    content: {
      paddingHorizontal: Spacing.md,
      gap: Spacing.lg,
    },
    back: {
      ...Typography.bodySm,
      color: DesignColors.accentSky,
      fontWeight: '600',
    },
    missing: {
      ...Typography.body,
      color: DesignColors.inkMuted,
      marginTop: Spacing.lg,
    },
    headerCapsule: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
    },
    plate: {
      ...Typography.headline,
      color: DesignColors.ink,
      fontWeight: '700',
      letterSpacing: 0.6,
      flex: 1,
    },
    costDivider: {
      height: 1,
      backgroundColor: DesignColors.hairline,
      marginTop: Spacing.sm,
    },
    costLabel: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    costValue: {
      ...Typography.metricValue,
      color: DesignColors.accentSky,
      fontSize: 32,
    },
    costMeta: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
  });
}
