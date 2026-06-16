import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/design';
import type { ParkingSlotStatus } from '@/features/staff/api';
import { HeroDestination } from '@/features/staff/components/hero-destination';
import {
  SLOT_HEADER_BORDER_RADIUS,
  SlotHeroVisual,
} from '@/features/staff/components/slot-hero-visual';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

function resolveStatusLabel(status: ParkingSlotStatus | string, t: (vi: string, en: string) => string) {
  if (status === 'CURRENTLY-IN-USED') {
    return t('Đang gửi xe', 'Vehicle parked');
  }
  if (status === 'UNAVAILABLE') {
    return t('Không khả dụng', 'Unavailable');
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
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const { floors } = useStaffWorkspace();

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
        };
      }
    }
    return null;
  }, [floorId, floorName, floors, slotId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      animation: 'none',
    });
  }, [navigation]);

  const hideTabBar = useCallback(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });
  }, [navigation]);

  const restoreTabBar = useCallback(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: undefined,
    });
  }, [navigation]);

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
          paddingTop: insets.top + Spacing.md,
          paddingHorizontal: Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl,
          gap: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [pressed && styles.buttonPressed]}>
          <ThemedText style={styles.linkText}>{t('← Quay lại', '← Back')}</ThemedText>
        </Pressable>

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
        </View>
      </ScrollView>
    </ThemedView>
  );
}
