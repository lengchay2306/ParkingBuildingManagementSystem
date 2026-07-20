import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import {
  getParkingSlots,
  type ParkingFloor,
  type ParkingSlot,
} from '@/features/staff/api';
import {
  SLOT_CELL_BORDER_RADIUS,
  StaffFloorSlotsPanel,
} from '@/features/staff/components/staff-floor-slots-panel';
import {
  StaffPageShell,
  useStaffPageContentStyle,
} from '@/features/staff/components/staff-page-shell';
import { StaffLoadingReveal } from '@/features/staff/components/staff-loading-lottie';
import { getStaffBottomNavScrollPadding } from '@/features/staff/components/staff-tab-bar';
import { StaffTextInput } from '@/features/staff/components/staff-text-input';
import { SlotHeroVisual } from '@/features/staff/components/slot-hero-visual';
import {
  StaffFilterPills,
  StaffScreenHeader,
  StaffSpotStatusBar,
} from '@/features/staff/components/premium';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import type { SpotStatusFilter, VehicleTypeFilter } from '@/features/staff/lib/parking-slot-filters';
import {
  buildVehicleTypeFilterOptions,
  countSpotStatuses,
  filterParkingFloors,
} from '@/features/staff/lib/staff-spots-filter';
import { useStaffScreenTitles } from '@/features/staff/lib/staff-screen-titles';
import { withMinimumLoadingDuration } from '@/features/staff/lib/minimum-loading-duration';
import { useHeroTransition } from '@/features/staff/motion/hero-transition-context';
import { measureHeroBounds } from '@/features/staff/motion/measure-hero-bounds';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useLanguagePreference } from '@/hooks/language-preference';

export default function StaffSlotsScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguagePreference();
  const titles = useStaffScreenTitles();
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const bottomNavReserve = useMemo(
    () => getStaffBottomNavScrollPadding(insets.bottom),
    [insets.bottom],
  );
  const pageContentStyle = useStaffPageContentStyle(undefined, false, undefined, bottomNavReserve);
  const { loadActiveSlotSessions } = useStaffWorkspace();
  const { startHero } = useHeroTransition();

  const [statusFilter, setStatusFilter] = useState<SpotStatusFilter>('ALL');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleTypeFilter>('ALL');
  const [slotSearch, setSlotSearch] = useState('');
  const [floors, setFloors] = useState<ParkingFloor[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadInFlightRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  const fetchSlots = useCallback(
    async ({
      withMinimumDuration = false,
      showLoading = false,
    }: { withMinimumDuration?: boolean; showLoading?: boolean } = {}) => {
      if (loadInFlightRef.current) {
        return;
      }

      loadInFlightRef.current = true;
      if (showLoading) {
        setIsLoadingSlots(true);
      }
      setSlotsError(null);

      const load = async () => {
        const data = await getParkingSlots();
        setFloors(data);
        hasLoadedOnceRef.current = true;
      };

      try {
        if (withMinimumDuration) {
          await withMinimumLoadingDuration(load);
        } else {
          await load();
        }
      } catch (error) {
        setFloors([]);
        setSlotsError(
          error instanceof Error ? error.message : t('Không tải được danh sách ô', 'Could not load spots'),
        );
      } finally {
        if (showLoading) {
          setIsLoadingSlots(false);
        }
        loadInFlightRef.current = false;
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      const isInitialLoad = !hasLoadedOnceRef.current;
      void fetchSlots({
        showLoading: isInitialLoad,
        withMinimumDuration: isInitialLoad,
      });
      void loadActiveSlotSessions().catch((error) => {
        setSlotsError(
          error instanceof Error
            ? error.message
            : t('Không tải được phiên đang gửi', 'Could not load active sessions'),
        );
      });
    }, [fetchSlots, loadActiveSlotSessions, t]),
  );

  const handleRefresh = useCallback(async () => {
    if (loadInFlightRef.current || isRefreshing) {
      return;
    }

    loadInFlightRef.current = true;
    setIsRefreshing(true);

    try {
      await withMinimumLoadingDuration(async () => {
        const [data] = await Promise.all([getParkingSlots(), loadActiveSlotSessions()]);
        setFloors(data);
        setSlotsError(null);
        hasLoadedOnceRef.current = true;
      });
    } catch (error) {
      setSlotsError(
        error instanceof Error ? error.message : t('Không tải được danh sách ô', 'Could not load spots'),
      );
    } finally {
      setIsRefreshing(false);
      loadInFlightRef.current = false;
    }
  }, [isRefreshing, loadActiveSlotSessions, t]);

  const spotCounts = useMemo(() => countSpotStatuses(floors), [floors]);

  const filteredFloors = useMemo(
    () =>
      filterParkingFloors(floors, {
        status: statusFilter,
        vehicleType: vehicleTypeFilter,
        searchQuery: slotSearch,
      }),
    [floors, slotSearch, statusFilter, vehicleTypeFilter],
  );

  const vehicleTypeOptions = useMemo(
    () => buildVehicleTypeFilterOptions(floors, t),
    [floors, t],
  );

  const openSlotDetail = useCallback(
    async (slot: ParkingSlot, floorId: string, floorName: string, ref?: View) => {
      if (ref) {
        try {
          const from = await measureHeroBounds(ref, SLOT_CELL_BORDER_RADIUS);
          const borderColor =
            slot.status === 'CURRENTLY-IN-USED'
              ? DesignColors.accentAmber
              : slot.status === 'RESERVED'
                ? DesignColors.accentSky
                : slot.status === 'UNAVAILABLE'
                  ? DesignColors.hairlineStrong
                  : DesignColors.accentEmerald;
          const backgroundColor =
            slot.status === 'CURRENTLY-IN-USED'
              ? 'rgba(251,146,60,0.16)'
              : slot.status === 'RESERVED'
                ? 'rgba(96,165,250,0.16)'
                : slot.status === 'UNAVAILABLE'
                  ? DesignColors.surface2
                  : 'rgba(16,185,129,0.10)';
          startHero({
            id: slot._id,
            from,
            borderColor,
            backgroundColor,
            content: (
              <SlotHeroVisual
                fill
                flight
                floorName={floorName}
                slotNumber={slot.slotNumber}
                status={slot.status}
                variant="header"
              />
            ),
          });
        } catch {
          // fall through to navigation
        }
      }
      router.push({
        pathname: '/staff-slots/[slotId]',
        params: {
          slotId: slot._id,
          floorId,
          floorName,
          slotNumber: slot.slotNumber,
        },
      });
    },
    [DesignColors, router, startHero],
  );

  return (
    <StaffPageShell scrollable={false}>
      <ScrollView
        contentContainerStyle={pageContentStyle}
        refreshControl={
          <RefreshControl
            onRefresh={() => void handleRefresh()}
            refreshing={isRefreshing}
            tintColor={DesignColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.slotsListHeader}>
          <StaffScreenHeader title={titles.spots} />

          <StaffSpotStatusBar
            counts={spotCounts}
            onChange={setStatusFilter}
            value={statusFilter}
          />

          <StaffTextInput
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={setSlotSearch}
            placeholder={t('Tìm số ô (vd. A12)...', 'Find spot (e.g. A12)...')}
            returnKeyType="search"
            value={slotSearch}
          />

          <StaffFilterPills
            onChange={setVehicleTypeFilter}
            options={vehicleTypeOptions}
            value={vehicleTypeFilter}
          />
        </View>

        <StaffLoadingReveal
          loading={isLoadingSlots && floors.length === 0}
          loadingStyle={styles.loadingIndicator}
          size={96}>
          {slotsError && floors.length === 0 ? (
            <ThemedText style={styles.emptyState}>{slotsError}</ThemedText>
          ) : (
            <StaffFloorSlotsPanel
              emptyHint={
                slotSearch.trim()
                  ? t('Không tìm thấy ô khớp tìm kiếm.', 'No spots match your search.')
                  : t('Không có ô phù hợp bộ lọc.', 'No spots match this filter.')
              }
              floors={filteredFloors}
              onOpenSlot={openSlotDetail}
              t={t}
            />
          )}
        </StaffLoadingReveal>
      </ScrollView>
    </StaffPageShell>
  );
}
