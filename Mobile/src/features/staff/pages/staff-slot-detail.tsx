import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/design';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffBackButton } from '@/features/staff/components/staff-back-button';
import {
  createHiddenStaffTabBarStyle,
  createStaffTabBarStyle,
} from '@/features/staff/components/staff-tab-bar';
import { HeroDestination } from '@/features/staff/components/hero-destination';
import {
  SLOT_HEADER_BORDER_RADIUS,
  SlotHeroVisual,
} from '@/features/staff/components/slot-hero-visual';
import { getParkingSlots, type ParkingFloor } from '@/features/staff/api';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { formatDurationFrom } from '@/features/staff/lib/utils';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import type { ParkingSlotStatus } from '@/features/staff/api';
import { staffSessionDetailPath } from '@/roles';

function resolveStatusLabel(status: ParkingSlotStatus | string, t: (vi: string, en: string) => string) {
  if (status === 'CURRENTLY-IN-USED') {
    return t('Đang gửi xe', 'Vehicle parked');
  }
  if (status === 'UNAVAILABLE') {
    return t('Không khả dụng', 'Unavailable');
  }
  if (status === 'RESERVED') {
    return t('Đã đặt trước', 'Reserved');
  }
  return t('Trống', 'Available');
}

export default function StaffSlotDetailScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { slotId, floorId, floorName } = useLocalSearchParams<{
    slotId: string;
    floorId?: string;
    floorName?: string;
  }>();
  const { t } = useLanguagePreference();
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const { activeSessionsBySlotId, loadActiveSlotSessions } = useStaffWorkspace();
  const [floors, setFloors] = useState<ParkingFloor[]>([]);

  useFocusEffect(
    useCallback(() => {
      const filters = floorId ? { floorId: String(floorId) } : {};
      void getParkingSlots(filters).then(setFloors).catch(() => setFloors([]));
      void loadActiveSlotSessions();
    }, [floorId, loadActiveSlotSessions]),
  );

  const slotContext = useMemo(() => {
    for (const floor of floors) {
      if (floorId && floor._id !== floorId) {
        continue;
      }
      const slot = floor.slots.find((item) => item._id === slotId);
      if (slot) {
        return {
          slot,
          floorName: floorName ?? floor.floorName,
          vehicleType: floor.vehicleType?.type,
        };
      }
    }
    return null;
  }, [floorId, floorName, floors, slotId]);

  const activeSession = activeSessionsBySlotId[slotId];

  useLayoutEffect(() => {
    navigation.setOptions({
      animation: 'none',
    });
  }, [navigation]);

  const tabBarBottomInset = insets.bottom;

  const hideTabBar = useCallback(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: createHiddenStaffTabBarStyle(),
    });
  }, [navigation]);

  const restoreTabBar = useCallback(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: createStaffTabBarStyle(tabBarBottomInset),
    });
  }, [navigation, tabBarBottomInset]);

  React.useEffect(() => {
    hideTabBar();
    return restoreTabBar;
  }, [hideTabBar, restoreTabBar]);

  const resolvedFloorName = slotContext?.floorName ?? floorName ?? '—';
  const resolvedSlotNumber = slotContext?.slot.slotNumber ?? slotId;
  const resolvedStatus = slotContext?.slot.status ?? 'AVAILABLE';

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          // Root SafeAreaView already applies top inset.
          paddingTop: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl,
          gap: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}>
        <StaffBackButton label={t('Quay lại', 'Back')} onPress={() => router.back()} />

        <HeroDestination heroId={slotId} borderRadius={SLOT_HEADER_BORDER_RADIUS}>
          <SlotHeroVisual
            floorName={resolvedFloorName}
            slotNumber={resolvedSlotNumber}
            status={resolvedStatus}
            variant="header"
          />
        </HeroDestination>

        <View style={styles.card}>
          <ThemedText style={styles.eyebrow}>{t('Chi tiết ô', 'Slot details')}</ThemedText>
          <ThemedText style={styles.sessionDetail}>
            {t('Tầng', 'Floor')}: {resolvedFloorName}
          </ThemedText>
          <ThemedText style={styles.sessionDetail}>
            {t('Mã ô', 'Slot')}: {resolvedSlotNumber}
          </ThemedText>
          <ThemedText style={styles.sessionDetail}>
            {t('Trạng thái', 'Status')}: {resolveStatusLabel(resolvedStatus, t)}
          </ThemedText>
          {slotContext?.vehicleType ? (
            <ThemedText style={styles.sessionDetail}>
              {t('Loại xe tầng', 'Floor vehicle type')}: {slotContext.vehicleType}
            </ThemedText>
          ) : null}
        </View>

        {activeSession ? (
          <View style={styles.card}>
            <ThemedText style={styles.eyebrow}>{t('Xe đang gửi', 'Parked vehicle')}</ThemedText>
            <ThemedText style={styles.sessionDetail}>
              {t('Biển số', 'Plate')}: {activeSession.plate}
            </ThemedText>
            <ThemedText style={styles.sessionDetail}>
              {t('Khách hàng', 'Customer')}:{' '}
              {activeSession.customerName ?? t('Chưa rõ', 'Unknown')}
            </ThemedText>
            <ThemedText style={styles.sessionDetail}>
              {t('Số điện thoại', 'Phone')}: {activeSession.customerPhone ?? '—'}
            </ThemedText>
            {activeSession.vehicleType ? (
              <ThemedText style={styles.sessionDetail}>
                {t('Loại xe', 'Vehicle')}: {activeSession.vehicleType}
              </ThemedText>
            ) : null}
            <ThemedText style={styles.sessionDetail}>
              {t('Giờ vào', 'Entry')}: {activeSession.timeLabel}
            </ThemedText>
            <ThemedText style={styles.sessionDetail}>
              {t('Thời lượng', 'Duration')}: {formatDurationFrom(activeSession.checkInTime)}
            </ThemedText>
            <StaffActionButton
              label={t('Xem phiên gửi xe', 'View parking session')}
              onPress={() => router.push(staffSessionDetailPath(activeSession.id) as never)}
              style={styles.fullWidthButton}
              variant="secondary"
            />
          </View>
        ) : resolvedStatus === 'CURRENTLY-IN-USED' ? (
          <View style={styles.card}>
            <ThemedText style={styles.hint}>
              {t(
                'Ô đang gửi nhưng chưa có dữ liệu phiên ACTIVE. Kéo refresh tại tab Spots hoặc Sessions.',
                'Slot is occupied but no ACTIVE session data loaded. Refresh Spots or Sessions tab.',
              )}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}
