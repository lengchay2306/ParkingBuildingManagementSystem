import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  getParkingSlots,
  type ParkingFloor,
  type ParkingSlot,
} from '@/features/staff/api';
import type { ParkingVehicleType } from '@/features/customer/api/parking';
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
import {
  buildParkingSlotApiFilters,
  type FloorFilter,
  type SpotStatusFilter,
  type VehicleTypeFilter,
} from '@/features/staff/lib/parking-slot-filters';
import { useHeroTransition } from '@/features/staff/motion/hero-transition-context';
import { measureHeroBounds } from '@/features/staff/motion/measure-hero-bounds';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

type ViewMode = 'list' | 'grid';

const VEHICLE_TYPE_FILTERS: ParkingVehicleType[] = ['SEDAN', 'SUV', 'MPV', 'PICKUP'];

function resolveSpotTone(
  status: string,
): 'available' | 'occupied' | 'unavailable' {
  if (status === 'CURRENTLY-IN-USED' || status === 'RESERVED') {
    return 'occupied';
  }
  if (status === 'UNAVAILABLE') {
    return 'unavailable';
  }
  return 'available';
}

function resolveStatusLabel(status: string, t: (vi: string, en: string) => string) {
  if (status === 'CURRENTLY-IN-USED') {
    return t('Đang gửi', 'Occupied');
  }
  if (status === 'RESERVED') {
    return t('Đã đặt', 'Reserved');
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
  const { loadActiveSlotSessions, activeSessionsBySlotId } = useStaffWorkspace();
  const { startHero } = useHeroTransition();

  const [statusFilter, setStatusFilter] = useState<SpotStatusFilter>('ALL');
  const [floorFilter, setFloorFilter] = useState<FloorFilter>('ALL');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleTypeFilter>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [floorCatalog, setFloorCatalog] = useState<ParkingFloor[]>([]);
  const [floors, setFloors] = useState<ParkingFloor[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const apiFilters = useMemo(
    () =>
      buildParkingSlotApiFilters({
        status: statusFilter,
        floorId: floorFilter,
        vehicleType: vehicleTypeFilter,
      }),
    [floorFilter, statusFilter, vehicleTypeFilter],
  );

  const fetchSlots = useCallback(async () => {
    setIsLoadingSlots(true);
    setSlotsError(null);
    try {
      const data = await getParkingSlots(apiFilters);
      setFloors(data);
    } catch (error) {
      setFloors([]);
      setSlotsError(
        error instanceof Error ? error.message : t('Không tải được danh sách ô', 'Could not load spots'),
      );
    } finally {
      setIsLoadingSlots(false);
    }
  }, [apiFilters, t]);

  const loadFloorCatalog = useCallback(async () => {
    try {
      const data = await getParkingSlots();
      setFloorCatalog(data);
    } catch {
      setFloorCatalog([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFloorCatalog();
      void loadActiveSlotSessions();
    }, [loadActiveSlotSessions, loadFloorCatalog]),
  );

  useEffect(() => {
    void fetchSlots();
  }, [fetchSlots]);

  const statusOptions = useMemo<StaffFilterOption<SpotStatusFilter>[]>(
    () => [
      { id: 'ALL', label: t('Tất cả', 'All') },
      { id: 'AVAILABLE', label: t('Trống', 'Available') },
      { id: 'RESERVED', label: t('Đã đặt', 'Reserved') },
      { id: 'CURRENTLY-IN-USED', label: t('Đang gửi', 'Occupied') },
      { id: 'UNAVAILABLE', label: t('Khóa', 'Locked') },
    ],
    [t],
  );

  const vehicleTypeOptions = useMemo<StaffFilterOption<VehicleTypeFilter>[]>(
    () => [
      { id: 'ALL', label: t('Mọi loại xe', 'All types') },
      ...VEHICLE_TYPE_FILTERS.map((type) => ({ id: type, label: type })),
    ],
    [t],
  );

  const floorOptions = useMemo<StaffFilterOption<FloorFilter>[]>(() => {
    const catalog =
      vehicleTypeFilter === 'ALL'
        ? floorCatalog
        : floorCatalog.filter((floor) => floor.vehicleType?.type === vehicleTypeFilter);

    return [
      { id: 'ALL', label: t('Mọi tầng', 'All floors') },
      ...catalog.map((floor) => ({
        id: floor._id,
        label: floor.floorName,
      })),
    ];
  }, [floorCatalog, t, vehicleTypeFilter]);

  const handleVehicleTypeChange = useCallback(
    (next: VehicleTypeFilter) => {
      setVehicleTypeFilter(next);
      if (next === 'ALL' || floorFilter === 'ALL') {
        return;
      }
      const selectedFloor = floorCatalog.find((floor) => floor._id === floorFilter);
      if (selectedFloor?.vehicleType?.type !== next) {
        setFloorFilter('ALL');
      }
    },
    [floorCatalog, floorFilter],
  );

  const viewOptions = useMemo<StaffFilterOption<ViewMode>[]>(
    () => [
      { id: 'list', label: t('Danh sách', 'List') },
      { id: 'grid', label: t('Lưới', 'Grid') },
    ],
    [t],
  );

  const flatSlots = useMemo(
    () =>
      floors.flatMap((floor) =>
        floor.slots.map((slot) => ({
          slot,
          floorId: floor._id,
          floorName: floor.floorName,
        })),
      ),
    [floors],
  );

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
          subtitle={t('Lọc ô gửi qua API backend', 'Spot filters powered by backend API')}
          title={t('Spots', 'Spots')}
        />
      }>
      <StaffFilterPills onChange={setStatusFilter} options={statusOptions} value={statusFilter} />
      <StaffFilterPills
        onChange={handleVehicleTypeChange}
        options={vehicleTypeOptions}
        value={vehicleTypeFilter}
      />
      <StaffFilterPills onChange={setFloorFilter} options={floorOptions} value={floorFilter} />
      <StaffFilterPills onChange={setViewMode} options={viewOptions} value={viewMode} />

      {isLoadingSlots ? (
        <ActivityIndicator color={DesignColors.primary} style={{ marginTop: 24 }} />
      ) : slotsError ? (
        <ThemedText style={{ color: DesignColors.inkMuted, textAlign: 'center', marginTop: 16 }}>
          {slotsError}
        </ThemedText>
      ) : viewMode === 'grid' ? (
        <StaffFloorSlotsPanel floors={floors} onOpenSlot={openSlotDetail} t={t} />
      ) : (
        <View style={{ gap: 10 }}>
          {flatSlots.length === 0 ? (
            <ThemedText style={{ color: DesignColors.inkMuted, textAlign: 'center', marginTop: 16 }}>
              {t('Không có ô phù hợp bộ lọc.', 'No spots match this filter.')}
            </ThemedText>
          ) : (
            flatSlots.map(({ slot, floorId, floorName }) => {
              const activeSession = activeSessionsBySlotId[slot._id];
              const subtitle = activeSession
                ? `${floorName} · ${activeSession.plate}`
                : floorName;

              return (
                <StaffSpotListCard
                  key={slot._id}
                  onPress={() => void openSlotDetail(slot, floorId, floorName)}
                  statusLabel={resolveStatusLabel(slot.status, t)}
                  subtitle={subtitle}
                  timestamp={activeSession?.timeLabel}
                  title={slot.slotNumber}
                  tone={resolveSpotTone(slot.status)}
                />
              );
            })
          )}
        </View>
      )}
    </StaffPageShell>
  );
}
