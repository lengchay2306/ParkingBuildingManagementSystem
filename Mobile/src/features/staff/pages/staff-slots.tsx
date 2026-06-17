import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import {
  SLOT_CELL_BORDER_RADIUS,
  StaffFloorSlotsPanel,
} from '@/features/staff/components/staff-floor-slots-panel';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { SlotHeroVisual } from '@/features/staff/components/slot-hero-visual';
import { StaffSlotStats } from '@/features/staff/components/staff-slot-stats';
import type { ParkingSlot } from '@/features/staff/api';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { useHeroTransition } from '@/features/staff/motion/hero-transition-context';
import { measureHeroBounds } from '@/features/staff/motion/measure-hero-bounds';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

export default function StaffSlotsScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const { floors, slotStats, isLoadingSlots, loadParkingSlots } = useStaffWorkspace();
  const { startHero } = useHeroTransition();

  useFocusEffect(
    useCallback(() => {
      void loadParkingSlots();
    }, [loadParkingSlots]),
  );

  const openSlotDetail = useCallback(
    async (slot: ParkingSlot, floorId: string, floorName: string, ref: View) => {
      try {
        const from = await measureHeroBounds(ref, SLOT_CELL_BORDER_RADIUS);
        startHero({
          id: slot._id,
          from,
          content: (
            <SlotHeroVisual
              fill
              slotNumber={slot.slotNumber}
              status={slot.status}
              variant="cell"
            />
          ),
        });
        router.push({
          pathname: '/staff-slots/[slotId]',
          params: { slotId: slot._id, floorId, floorName },
        });
      } catch {
        router.push({
          pathname: '/staff-slots/[slotId]',
          params: { slotId: slot._id, floorId, floorName },
        });
      }
    },
    [router, startHero],
  );

  return (
    <StaffPageShell
      eyebrow={t('Bãi xe', 'Parking lot')}
      title={t('Trạng thái ô gửi', 'Slot status')}
      subtitle={t('Theo dõi từng tầng theo thời gian thực.', 'Monitor each floor in real time.')}>
      <View style={styles.card}>
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
        <StaffActionButton
          label={t('Làm mới', 'Refresh')}
          onPress={() => void loadParkingSlots()}
          variant="secondary"
        />
      </View>

      <View style={styles.card}>
        {isLoadingSlots ? (
          <ActivityIndicator color={DesignColors.accentViolet} />
        ) : (
          <StaffFloorSlotsPanel floors={floors} onOpenSlot={openSlotDetail} t={t} />
        )}
      </View>
    </StaffPageShell>
  );
}
