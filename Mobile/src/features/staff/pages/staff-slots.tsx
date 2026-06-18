import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ParkingSlot, ParkingSlotStatus } from '@/features/staff/api';
import {
  SLOT_CELL_BORDER_RADIUS,
  StaffFloorSlotsPanel,
} from '@/features/staff/components/staff-floor-slots-panel';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { SlotHeroVisual } from '@/features/staff/components/slot-hero-visual';
import {
  StaffFilterPills,
  StaffScreenHeader,
  StaffSpotListCard,
  type StaffFilterOption,
} from '@/features/staff/components/premium';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { useHeroTransition } from '@/features/staff/motion/hero-transition-context';
import { measureHeroBounds } from '@/features/staff/motion/measure-hero-bounds';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

type SpotFilter = 'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'UNAVAILABLE';
type ViewMode = 'list' | 'grid';

function resolveSpotTone(status: ParkingSlotStatus | string): 'available' | 'occupied' | 'unavailable' {
  if (status === 'CURRENTLY-IN-USED') {
    return 'occupied';
  }
  if (status === 'UNAVAILABLE') {
    return 'unavailable';
  }
  return 'available';
}

function resolveStatusLabel(
  status: ParkingSlotStatus | string,
  t: (vi: string, en: string) => string,
) {
  if (status === 'CURRENTLY-IN-USED') {
    return t('Đang gửi', 'Occupied');
  }
  if (status === 'UNAVAILABLE') {
    return t('Không khả dụng', 'Unavailable');
  }
  return t('Trống', 'Available');
}

export default function StaffSlotsScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const { floors, isLoadingSlots, loadParkingSlots } = useStaffWorkspace();
  const { startHero } = useHeroTransition();
  const [statusFilter, setStatusFilter] = useState<SpotFilter>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useFocusEffect(
    useCallback(() => {
      void loadParkingSlots();
    }, [loadParkingSlots]),
  );

  const filterOptions = useMemo<StaffFilterOption<SpotFilter>[]>(
    () => [
      { id: 'ALL', label: t('Tất cả', 'All') },
      { id: 'AVAILABLE', label: t('Trống', 'Available') },
      { id: 'OCCUPIED', label: t('Đang gửi', 'Occupied') },
      { id: 'UNAVAILABLE', label: t('Khóa', 'Locked') },
    ],
    [t],
  );

  const viewOptions = useMemo<StaffFilterOption<ViewMode>[]>(
    () => [
      { id: 'list', label: t('Danh sách', 'List') },
      { id: 'grid', label: t('Lưới', 'Grid') },
    ],
    [t],
  );

  const flatSlots = useMemo(() => {
    return floors.flatMap((floor) =>
      floor.slots.map((slot) => ({
        slot,
        floorId: floor._id,
        floorName: floor.floorName,
      })),
    );
  }, [floors]);

  const filteredSlots = useMemo(() => {
    return flatSlots.filter(({ slot }) => {
      if (statusFilter === 'ALL') {
        return true;
      }
      if (statusFilter === 'AVAILABLE') {
        return slot.status === 'AVAILABLE';
      }
      if (statusFilter === 'OCCUPIED') {
        return slot.status === 'CURRENTLY-IN-USED';
      }
      return slot.status === 'UNAVAILABLE';
    });
  }, [flatSlots, statusFilter]);

  const openSlotDetail = useCallback(
    async (slot: ParkingSlot, floorId: string, floorName: string, ref?: View) => {
      if (ref) {
        try {
          const from = await measureHeroBounds(ref, SLOT_CELL_BORDER_RADIUS);
          startHero({
            id: slot._id,
            from,
            content: (
              <SlotHeroVisual fill slotNumber={slot.slotNumber} status={slot.status} variant="cell" />
            ),
          });
        } catch {
          // fall through to navigation
        }
      }
      router.push({
        pathname: '/staff-slots/[slotId]',
        params: { slotId: slot._id, floorId, floorName },
      });
    },
    [router, startHero],
  );

  return (
    <StaffPageShell
      header={
        <StaffScreenHeader
          subtitle={t('Quản lý trạng thái từng ô gửi', 'Manage every parking spot')}
          title={t('Spots', 'Spots')}
        />
      }>
      <StaffFilterPills onChange={setStatusFilter} options={filterOptions} value={statusFilter} />
      <StaffFilterPills onChange={setViewMode} options={viewOptions} value={viewMode} />

      {isLoadingSlots ? (
        <ActivityIndicator color={DesignColors.primary} style={{ marginTop: 24 }} />
      ) : viewMode === 'grid' ? (
        <StaffFloorSlotsPanel floors={floors} onOpenSlot={openSlotDetail} t={t} />
      ) : (
        <View style={{ gap: 10 }}>
          {filteredSlots.length === 0 ? (
            <ThemedText style={{ color: DesignColors.inkMuted, textAlign: 'center', marginTop: 16 }}>
              {t('Không có ô phù hợp bộ lọc.', 'No spots match this filter.')}
            </ThemedText>
          ) : (
            filteredSlots.map(({ slot, floorId, floorName }) => (
              <StaffSpotListCard
                key={slot._id}
                onPress={() => void openSlotDetail(slot, floorId, floorName)}
                statusLabel={resolveStatusLabel(slot.status, t)}
                subtitle={floorName}
                title={slot.slotNumber}
                tone={resolveSpotTone(slot.status)}
              />
            ))
          )}
        </View>
      )}
    </StaffPageShell>
  );
}
