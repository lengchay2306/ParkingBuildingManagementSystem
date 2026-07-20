import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { MaxContentWidth } from '@/constants/theme';
import { isSlotBookable } from '@/features/customer/components/floor-slots-panel';
import { ParkingMapGlCanvas } from '@/features/customer/components/parking-map-gl-canvas';
import {
  getActiveUserParkingSession,
  getParkingSlots,
  type ParkingFloor,
  type ParkingSlot,
} from '@/features/customer/api/parking';
import {
  createReservation,
  getDefaultExpectedArrivalDate,
  getDefaultExpectedArrivalTime,
  getMyReservations,
  isExpectedArrivalValid,
  parseExpectedArrival,
  sortReservationsNewestFirst,
  type Reservation,
} from '@/features/customer/api/reservations';
import { mapApiSlotStatus } from '@/features/customer/lib/parking-map-layout';
import { getVehicleReserveBlockReasonLocalized, collectMyReservedSlotIds } from '@/features/customer/lib/parking-validation';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useProtectedSession } from '@/hooks/use-protected-session';
import { useThemePreference } from '@/hooks/theme-preference';
import { getMyProfile, type UserVehicle } from '@/lib/auth-api';
import { formatDbStatus } from '@/lib/db-status';
import {
  resolveFloorPresentation,
  resolveParkingVehicleTypeLabel,
  sortFloorsLikeParkingMap,
} from '@/lib/parking-floor-config';

/** Live map poll while screen focused — staff check-in should appear quickly. */
const MAP_LIVE_POLL_MS = 5_000;

function normalizeId(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const normalized = String(value).trim();
    return normalized || null;
  }
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return normalizeId((value as { _id?: unknown })._id);
  }
  return null;
}

function resolveVehicleTypeLabel(vehicle: UserVehicle): string | null {
  const type = vehicle.vehicleTypeId as unknown;
  if (!type) {
    return null;
  }
  if (typeof type === 'string') {
    return null;
  }
  if (typeof type === 'object' && type !== null && 'type' in type) {
    const name = (type as { type?: unknown }).type;
    return typeof name === 'string' && name.trim() ? name.trim() : null;
  }
  return null;
}

function resolveVehicleTypeId(vehicle: UserVehicle): string | null {
  return normalizeId(vehicle.vehicleTypeId as unknown);
}

function resolveFloorVehicleTypeId(floor: ParkingFloor): string | null {
  return (
    normalizeId(floor.vehicleType?._id) ??
    normalizeId(floor.vehicleTypeId) ??
    normalizeId(floor.vehicleType)
  );
}

function resolveFloorVehicleTypeName(floor: ParkingFloor): string | null {
  const fromField = floor.vehicleType?.type?.trim();
  if (fromField) {
    return fromField.toUpperCase();
  }
  if (floor.vehicleTypeId && typeof floor.vehicleTypeId === 'object') {
    const name = floor.vehicleTypeId.type?.trim();
    if (name) {
      return name.toUpperCase();
    }
  }
  // Fallback: "Tầng 1 - BIKE"
  const fromName = floor.floorName.split(' - ')[1]?.trim();
  return fromName ? fromName.toUpperCase() : null;
}

/** Same idea as FE DriverVehicleReserveDialog: match by type id, then type name. */
function vehicleMatchesFloor(vehicle: UserVehicle, floor: ParkingFloor): boolean {
  const floorTypeId = resolveFloorVehicleTypeId(floor);
  const vehicleTypeId = resolveVehicleTypeId(vehicle);
  if (floorTypeId && vehicleTypeId && floorTypeId === vehicleTypeId) {
    return true;
  }

  const floorTypeName = resolveFloorVehicleTypeName(floor);
  const vehicleTypeName = resolveVehicleTypeLabel(vehicle)?.toUpperCase() ?? null;
  if (floorTypeName && vehicleTypeName && floorTypeName === vehicleTypeName) {
    return true;
  }

  if (vehicleTypeName && floor.floorName.toUpperCase().includes(vehicleTypeName)) {
    return true;
  }

  return false;
}

function statusLabel(status: string | undefined): string {
  return formatDbStatus(status);
}

export default function ParkingMapScreen() {
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const { resolvedScheme } = useThemePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const [floors, setFloors] = useState<ParkingFloor[]>([]);
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeSessionVehicleIds, setActiveSessionVehicleIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFloorId, setActiveFloorId] = useState<string | 'all'>('all');
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<ParkingFloor | null>(null);

  const [bookOpen, setBookOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [arrivalDate, setArrivalDate] = useState(getDefaultExpectedArrivalDate);
  const [arrivalTime, setArrivalTime] = useState(getDefaultExpectedArrivalTime);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useProtectedSession();

  const orderedFloors = useMemo(() => sortFloorsLikeParkingMap(floors), [floors]);

  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.status?.toUpperCase() !== 'INACTIVE'),
    [vehicles],
  );

  const eligibleVehicles = useMemo(() => {
    if (!selectedFloor) {
      return [];
    }
    return activeVehicles.filter((vehicle) => {
      if (!vehicleMatchesFloor(vehicle, selectedFloor)) {
        return false;
      }
      const blockReason = getVehicleReserveBlockReasonLocalized(vehicle._id, reservations, t, {
        hasActiveSession: activeSessionVehicleIds.has(vehicle._id),
      });
      return !blockReason;
    });
  }, [activeVehicles, activeSessionVehicleIds, reservations, selectedFloor, t]);

  const typeMatchedButBlocked = useMemo(() => {
    if (!selectedFloor) {
      return [];
    }
    return activeVehicles
      .filter((vehicle) => vehicleMatchesFloor(vehicle, selectedFloor))
      .map((vehicle) => ({
        vehicle,
        reason: getVehicleReserveBlockReasonLocalized(vehicle._id, reservations, t, {
          hasActiveSession: activeSessionVehicleIds.has(vehicle._id),
        }),
      }))
      .filter((item) => !!item.reason);
  }, [activeVehicles, activeSessionVehicleIds, reservations, selectedFloor, t]);

  const selectedVehicle = useMemo(
    () => eligibleVehicles.find((v) => v._id === selectedVehicleId) ?? null,
    [eligibleVehicles, selectedVehicleId],
  );

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const [profile, apiFloors, myReservations] = await Promise.all([
          getMyProfile(),
          getParkingSlots(),
          getMyReservations(undefined, { limit: 100 }),
        ]);
        const nextVehicles = profile.vehicles ?? [];
        setVehicles(nextVehicles);
        setFloors(apiFloors);
        setReservations(myReservations);

        const activeIds = new Set<string>();
        await Promise.all(
          nextVehicles
            .filter((v) => v.status?.toUpperCase() !== 'INACTIVE')
            .map(async (vehicle) => {
              const session = await getActiveUserParkingSession(vehicle._id);
              if (session) {
                activeIds.add(vehicle._id);
              }
            }),
        );
        setActiveSessionVehicleIds(activeIds);
      } catch (loadError) {
        if (!silent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t('Không tải được bản đồ', 'Could not load parking map'),
          );
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [t],
  );

  const refreshLiveMap = useCallback(async () => {
    try {
      const [apiFloors, pendingList] = await Promise.all([
        getParkingSlots(),
        getMyReservations('PENDING', { limit: 100 }),
      ]);
      setFloors(apiFloors);
      setReservations((prev) => {
        const nonPending = prev.filter((item) => item.status?.toUpperCase() !== 'PENDING');
        return sortReservationsNewestFirst([...pendingList, ...nonPending]);
      });
    } catch {
      // Keep last good snapshot on transient network errors.
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Continuous live refresh while the map tab is focused (and app is active).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let intervalId: ReturnType<typeof setInterval> | null = null;
      const appStateRef = { current: AppState.currentState };

      const tick = () => {
        if (cancelled || appStateRef.current !== 'active') {
          return;
        }
        void refreshLiveMap();
      };

      void refreshLiveMap();
      intervalId = setInterval(tick, MAP_LIVE_POLL_MS);

      const onAppStateChange = (next: AppStateStatus) => {
        appStateRef.current = next;
        if (next === 'active' && !cancelled) {
          void refreshLiveMap();
        }
      };
      const sub = AppState.addEventListener('change', onAppStateChange);

      return () => {
        cancelled = true;
        if (intervalId) {
          clearInterval(intervalId);
        }
        sub.remove();
      };
    }, [refreshLiveMap]),
  );

  // Keep open slot sheet in sync when staff updates status live.
  useEffect(() => {
    if (!selectedSlot) {
      return;
    }
    for (const floor of floors) {
      const liveSlot = floor.slots.find((slot) => slot._id === selectedSlot._id);
      if (!liveSlot) {
        continue;
      }
      if (liveSlot.status !== selectedSlot.status) {
        setSelectedSlot(liveSlot);
        setSelectedFloor(floor);
      }
      break;
    }
  }, [floors, selectedSlot]);


  useEffect(() => {
    if (orderedFloors.length === 0) {
      setActiveFloorId('all');
      return;
    }
    setActiveFloorId((current) => {
      if (current === 'all') {
        return 'all';
      }
      if (orderedFloors.some((floor) => floor._id === current)) {
        return current;
      }
      return orderedFloors[0]._id;
    });
  }, [orderedFloors]);

  const focusedFloor = useMemo(() => {
    if (activeFloorId === 'all') {
      return null;
    }
    return orderedFloors.find((floor) => floor._id === activeFloorId) ?? null;
  }, [activeFloorId, orderedFloors]);

  const totals = useMemo(() => {
    return orderedFloors.reduce(
      (acc, floor) => {
        acc.available += floor.slotStats?.available ?? 0;
        acc.reserved += floor.slotStats?.reserved ?? 0;
        acc.total += floor.slotStats?.total ?? floor.slots.length;
        acc.inUsed += floor.slotStats?.inUsed ?? 0;
        return acc;
      },
      { available: 0, reserved: 0, total: 0, inUsed: 0 },
    );
  }, [orderedFloors]);

  function handleSelectSlot(slot: ParkingSlot, floor: ParkingFloor) {
    const liveFloor = orderedFloors.find((item) => item._id === floor._id) ?? floor;
    const liveSlot = liveFloor.slots.find((item) => item._id === slot._id) ?? slot;
    setSelectedSlot(liveSlot);
    setSelectedFloor(liveFloor);
    setBookOpen(false);
    if (activeFloorId === 'all') {
      setActiveFloorId(liveFloor._id);
    }
  }

  function closeSlotSheet() {
    setSelectedSlot(null);
    setSelectedFloor(null);
    setBookOpen(false);
  }

  async function openBookFlow() {
    if (!selectedSlot || !selectedFloor) {
      return;
    }

    let latestVehicles = activeVehicles;
    let latestReservations = reservations;
    let latestActiveIds = activeSessionVehicleIds;
    try {
      const [profile, myReservations] = await Promise.all([
        getMyProfile(),
        getMyReservations(undefined, { limit: 100 }),
      ]);
      const nextVehicles = profile.vehicles ?? [];
      setVehicles(nextVehicles);
      setReservations(myReservations);
      latestVehicles = nextVehicles.filter((v) => v.status?.toUpperCase() !== 'INACTIVE');
      latestReservations = myReservations;

      const activeIds = new Set<string>();
      await Promise.all(
        latestVehicles.map(async (vehicle) => {
          const session = await getActiveUserParkingSession(vehicle._id);
          if (session) {
            activeIds.add(vehicle._id);
          }
        }),
      );
      setActiveSessionVehicleIds(activeIds);
      latestActiveIds = activeIds;
    } catch {
      // Fall back to in-memory state.
    }

    if (latestVehicles.length === 0) {
      showToast(
        t('Vui lòng đăng ký xe trong Hồ sơ trước', 'Register a vehicle in Profile first'),
        'error',
      );
      return;
    }

    const liveFloor =
      orderedFloors.find((item) => item._id === selectedFloor._id) ?? selectedFloor;
    setSelectedFloor(liveFloor);

    const typeMatched = latestVehicles.filter((vehicle) =>
      vehicleMatchesFloor(vehicle, liveFloor),
    );
    if (typeMatched.length === 0) {
      const floorType = resolveFloorVehicleTypeName(liveFloor) ?? liveFloor.vehicleType?.type ?? '—';
      showToast(
        t(
          `Không có xe loại ${floorType} trong tài khoản. Thêm xe phù hợp trong Hồ sơ.`,
          `No ${floorType} vehicle on your account. Add a matching vehicle in Profile.`,
        ),
        'error',
      );
      return;
    }

    const bookable = typeMatched.filter(
      (vehicle) =>
        !getVehicleReserveBlockReasonLocalized(vehicle._id, latestReservations, t, {
          hasActiveSession: latestActiveIds.has(vehicle._id),
      }),
    );

    if (bookable.length === 0) {
      const reason =
        getVehicleReserveBlockReasonLocalized(typeMatched[0]._id, latestReservations, t, {
          hasActiveSession: latestActiveIds.has(typeMatched[0]._id),
        }) ??
        t(
          'Xe phù hợp đã có đặt chỗ hoặc đang gửi trong bãi.',
          'Matching vehicles already have a reservation or are parked.',
        );
      showToast(reason, 'error');
      return;
    }

    setSelectedVehicleId(bookable[0]._id);
    setArrivalDate(getDefaultExpectedArrivalDate());
    setArrivalTime(getDefaultExpectedArrivalTime());
    setBookOpen(true);
  }

  async function handleCreateReservation() {
    if (!selectedSlot || !selectedVehicleId) {
      return;
    }
    const vehicleType = selectedVehicle ? resolveVehicleTypeLabel(selectedVehicle) : null;
    if (!selectedFloor || !isSlotBookable(selectedSlot, selectedFloor, vehicleType)) {
      showToast(
        t('Ô này không phù hợp với loại xe đã chọn', 'Slot does not match selected vehicle type'),
        'error',
      );
      return;
    }

    const blockReason = getVehicleReserveBlockReasonLocalized(
      selectedVehicleId,
      reservations,
      t,
      { hasActiveSession: activeSessionVehicleIds.has(selectedVehicleId) },
    );
    if (blockReason) {
      showToast(blockReason, 'error');
            return;
          }

    if (!isExpectedArrivalValid(arrivalDate, arrivalTime)) {
      showToast(
        t(
          'Giờ đến phải trong tương lai và không quá 2 giờ kể từ bây giờ',
          'Arrival must be in the future and within the next 2 hours',
        ),
        'error',
      );
      return;
    }

    const expectedArrival = parseExpectedArrival(arrivalDate, arrivalTime);
    if (!expectedArrival) {
      showToast(
        t('Định dạng ngày/giờ không hợp lệ (YYYY-MM-DD và HH:mm)', 'Invalid date/time (YYYY-MM-DD and HH:mm)'),
        'error',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await createReservation({
        vehicleId: selectedVehicleId,
        parkingSlotId: selectedSlot._id,
        expectedArrival: expectedArrival.toISOString(),
      });

      // Optimistic: mark slot reserved immediately so the 3D map recolors without waiting.
      const bookedSlotId = selectedSlot._id;
      setFloors((prev) =>
        prev.map((floor) => ({
          ...floor,
          slots: floor.slots.map((slot) =>
            slot._id === bookedSlotId ? { ...slot, status: 'RESERVED' } : slot,
          ),
          slotStats: floor.slotStats
            ? {
                ...floor.slotStats,
                available: Math.max(0, (floor.slotStats.available ?? 0) - 1),
                reserved: (floor.slotStats.reserved ?? 0) + 1,
              }
            : floor.slotStats,
        })),
      );

      showToast(t('Đặt chỗ thành công', 'Reservation created'), 'success');
      closeSlotSheet();
      await loadData(true);
    } catch (submitError) {
      showToast(
        submitError instanceof Error
          ? submitError.message
          : t('Không đặt được chỗ', 'Could not create reservation'),
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const myReservedSlotIds = useMemo(
    () => collectMyReservedSlotIds(reservations),
    [reservations],
  );

  const isSelectedSlotMine =
    !!selectedSlot && myReservedSlotIds.has(selectedSlot._id);

  const canBook =
    !!selectedSlot &&
    !!selectedFloor &&
    selectedSlot.status === 'AVAILABLE' &&
    !myReservedSlotIds.has(selectedSlot._id);

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.header}>
        <ThemedText style={styles.eyebrow}>PARKASE</ThemedText>
        <ThemedText style={styles.title}>{t('Bản đồ bãi đỗ', 'Parking map')}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {t(
            `${totals.available} trống · ${totals.reserved} đặt · ${totals.inUsed} đang dùng`,
            `${totals.available} free · ${totals.reserved} reserved · ${totals.inUsed} in use`,
          )}
        </ThemedText>
      </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        style={styles.floorTabsScroll}
          contentContainerStyle={styles.floorTabs}
        >
          <Pressable
          onPress={() => {
            setActiveFloorId('all');
            closeSlotSheet();
          }}
          style={[styles.floorTab, activeFloorId === 'all' && styles.floorTabActive]}
          >
            <ThemedText
            style={[styles.floorTabText, activeFloorId === 'all' && styles.floorTabTextActive]}
            >
              {t('Tất cả', 'All')}
            </ThemedText>
          </Pressable>
        {orderedFloors.map((floor) => {
          const presentation = resolveFloorPresentation(floor, t);
          const active = activeFloorId === floor._id;
          return (
            <Pressable
              key={floor._id}
              onPress={() => {
                setActiveFloorId(floor._id);
                closeSlotSheet();
              }}
              style={[styles.floorTab, active && styles.floorTabActive]}
            >
              <ThemedText style={[styles.floorTabText, active && styles.floorTabTextActive]}>
                {presentation.tabLabel}
              </ThemedText>
            </Pressable>
          );
        })}
        </ScrollView>

      {focusedFloor ? (
        <ThemedText style={styles.floorMeta}>
          {resolveFloorPresentation(focusedFloor, t).metaTitle}
            </ThemedText>
      ) : (
        <ThemedText style={styles.floorMeta}>
          {t('Vuốt để xoay · chụm để zoom · chạm ô để xem', 'Drag to orbit · pinch zoom · tap a slot')}
        </ThemedText>
      )}

      <View style={styles.legendRow}>
        {(
          [
            ['available', 'AVAILABLE', DesignColors.semanticSuccess],
            ['reserved', 'RESERVED', DesignColors.semanticWarning],
            ['mine', 'MINE', DesignColors.primary],
            ['in-use', 'CURRENTLY-IN-USED', DesignColors.inkMuted],
            ['unavailable', 'UNAVAILABLE', DesignColors.semanticDanger],
          ] as const
        ).map(([key, label, color]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <ThemedText style={styles.legendText}>{label}</ThemedText>
          </View>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={DesignColors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable onPress={() => loadData()} style={styles.retryButton}>
            <ThemedText style={styles.retryText}>{t('Thử lại', 'Retry')}</ThemedText>
            </Pressable>
        </View>
      ) : orderedFloors.length === 0 ? (
        <View style={styles.centerState}>
          <ThemedText style={styles.errorText}>
            {t('Không có dữ liệu bãi đỗ', 'No parking data')}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.mapWrap}>
          <ParkingMapGlCanvas
            floors={orderedFloors}
            activeFloorId={activeFloorId}
            selectedSlotId={selectedSlot?._id ?? null}
            myReservedSlotIds={myReservedSlotIds}
            onSelectSlot={handleSelectSlot}
            onClearSelection={closeSlotSheet}
            DesignColors={DesignColors}
            resolvedScheme={resolvedScheme === 'light' ? 'light' : 'dark'}
            t={t}
          />
            <Pressable
            onPress={() => loadData(true)}
            style={styles.refreshFab}
            accessibilityLabel={t('Làm mới', 'Refresh')}
          >
            <Ionicons name="refresh" size={16} color={DesignColors.ink} />
            </Pressable>
        </View>
      )}

      <Modal visible={!!selectedSlot} transparent animationType="slide" onRequestClose={closeSlotSheet}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={closeSlotSheet} />
          <View style={styles.sheet}>
            {selectedSlot && selectedFloor ? (
              <>
                <View style={styles.sheetHandle} />
                <ThemedText style={styles.sheetTitle}>{selectedSlot.slotNumber}</ThemedText>
                <ThemedText style={styles.sheetMeta}>
                  {selectedFloor.floorName} ·{' '}
                  {resolveParkingVehicleTypeLabel(selectedFloor.vehicleType?.type, t)}
                </ThemedText>
                <View style={styles.statusPill}>
                  <ThemedText style={styles.statusPillText}>
                    {statusLabel(selectedSlot.status)}
                  </ThemedText>
                </View>

                {!bookOpen ? (
                  <View style={styles.sheetActions}>
                    <Pressable onPress={closeSlotSheet} style={styles.secondaryButton}>
                      <ThemedText style={styles.secondaryButtonText}>{t('Đóng', 'Close')}</ThemedText>
            </Pressable>
                    {canBook ? (
                      <Pressable onPress={openBookFlow} style={styles.primaryButton}>
                        <ThemedText style={styles.primaryButtonText}>
                          {t('Đăng ký gửi xe', 'Reserve slot')}
                        </ThemedText>
            </Pressable>
                    ) : (
                      <View style={[styles.primaryButton, styles.buttonDisabled]}>
                        <ThemedText style={styles.primaryButtonText}>
                          {isSelectedSlotMine
                            ? t('Đã đặt bởi bạn', 'Already yours')
                            : selectedSlot.status === 'RESERVED'
                              ? t('Đã có người đặt', 'Already reserved')
                              : selectedSlot.status === 'CURRENTLY-IN-USED'
                                ? t('Đang sử dụng', 'In use')
                                : t('Không thể đặt', 'Unavailable')}
                        </ThemedText>
          </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.bookForm}>
                    <ThemedText style={styles.bookLabel}>
                      {t('Chọn xe', 'Select vehicle')} ·{' '}
                      {resolveParkingVehicleTypeLabel(selectedFloor.vehicleType?.type, t)}
            </ThemedText>
                    {eligibleVehicles.length === 0 ? (
                      <ThemedText style={styles.emptyVehiclesText}>
                        {typeMatchedButBlocked.length > 0
                          ? typeMatchedButBlocked[0].reason
                          : t(
                              'Không có xe đúng loại với tầng này. Thêm xe trong Hồ sơ.',
                              'No vehicle matches this floor type. Add one in Profile.',
              )}
            </ThemedText>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.vehicleRow}
                      >
                        {eligibleVehicles.map((vehicle) => {
                          const active = vehicle._id === selectedVehicleId;
                          const typeLabel = resolveVehicleTypeLabel(vehicle);
                          return (
                            <Pressable
                              key={vehicle._id}
                              onPress={() => setSelectedVehicleId(vehicle._id)}
                              style={[styles.vehicleChip, active && styles.vehicleChipActive]}
                            >
                              <ThemedText
                  style={[
                                  styles.vehicleChipText,
                                  active && styles.vehicleChipTextActive,
                                ]}
                              >
                                {vehicle.licensePlate}
                              </ThemedText>
                              <ThemedText style={styles.vehicleChipSub}>
                                {resolveParkingVehicleTypeLabel(typeLabel ?? undefined, t)}
                              </ThemedText>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}

                    <ThemedText style={styles.bookLabel}>
                      {t('Thời gian đến dự kiến', 'Expected arrival')}
                    </ThemedText>
                    <View style={styles.arrivalRow}>
                      <View style={styles.arrivalField}>
                        <ThemedText style={styles.arrivalFieldLabel}>{t('Ngày', 'Date')}</ThemedText>
                        <TextInput
                          value={arrivalDate}
                          onChangeText={setArrivalDate}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={DesignColors.placeholder}
                          autoCapitalize="none"
                          style={styles.arrivalInput}
                        />
                      </View>
                      <View style={styles.arrivalField}>
                        <ThemedText style={styles.arrivalFieldLabel}>{t('Giờ', 'Time')}</ThemedText>
                        <TextInput
                          value={arrivalTime}
                          onChangeText={setArrivalTime}
                          placeholder="HH:mm"
                          placeholderTextColor={DesignColors.placeholder}
                          autoCapitalize="none"
                          style={styles.arrivalInput}
                        />
                      </View>
                    </View>
                    {!isExpectedArrivalValid(arrivalDate, arrivalTime) ? (
                      <ThemedText style={styles.arrivalHint}>
                        {t(
                          'Giờ đến phải trong tương lai và trong vòng 2 giờ (YYYY-MM-DD · HH:mm)',
                          'Arrival must be future and within 2 hours (YYYY-MM-DD · HH:mm)',
                        )}
                      </ThemedText>
                    ) : null}

                    <View style={styles.sheetActions}>
                      <Pressable onPress={() => setBookOpen(false)} style={styles.secondaryButton}>
                        <ThemedText style={styles.secondaryButtonText}>
                          {t('Quay lại', 'Back')}
              </ThemedText>
                      </Pressable>
                <Pressable
                        onPress={handleCreateReservation}
                        disabled={
                          isSubmitting ||
                          !selectedVehicle ||
                          eligibleVehicles.length === 0 ||
                          !isExpectedArrivalValid(arrivalDate, arrivalTime)
                        }
                        style={[
                          styles.primaryButton,
                          (isSubmitting ||
                            !selectedVehicle ||
                            eligibleVehicles.length === 0 ||
                            !isExpectedArrivalValid(arrivalDate, arrivalTime)) &&
                            styles.buttonDisabled,
                        ]}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color={DesignColors.onPrimary} />
                        ) : (
                          <ThemedText style={styles.primaryButtonText}>
                            {t('Xác nhận đặt chỗ', 'Confirm booking')}
                  </ThemedText>
              )}
                      </Pressable>
                    </View>
              </View>
          )}
              </>
            ) : null}
        </View>
      </View>
      </Modal>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    screen: {
    flex: 1,
    maxWidth: MaxContentWidth,
      width: '100%',
    alignSelf: 'center',
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      gap: Spacing.sm,
  },
  header: {
      gap: 2,
  },
  eyebrow: {
      ...Typography.eyebrow,
      textTransform: 'uppercase',
      color: DesignColors.inkSubtle,
  },
  title: {
      ...Typography.headline,
    color: DesignColors.ink,
  },
  subtitle: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    floorTabsScroll: {
      flexGrow: 0,
      flexShrink: 0,
      maxHeight: 40,
  },
  floorTabs: {
    flexDirection: 'row',
      alignItems: 'center',
    gap: Spacing.xs,
      paddingVertical: 2,
      minHeight: 36,
  },
  floorTab: {
      borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      height: 36,
      justifyContent: 'center',
    alignItems: 'center',
      alignSelf: 'center',
  },
  floorTabActive: {
      backgroundColor: DesignColors.primary,
    borderColor: DesignColors.primary,
  },
  floorTabText: {
      ...Typography.caption,
      color: DesignColors.ink,
      fontWeight: '600',
      lineHeight: 16,
  },
  floorTabTextActive: {
      color: DesignColors.onPrimary,
  },
  floorMeta: {
      ...Typography.caption,
      flexGrow: 0,
      flexShrink: 0,
    color: DesignColors.inkMuted,
  },
    legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
    alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 2,
    },
    legendText: {
    ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    mapWrap: {
      flex: 1,
      minHeight: 340,
      borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
      overflow: 'hidden',
      marginBottom: Spacing.md,
      backgroundColor: DesignColors.surface1,
    },
    refreshFab: {
      position: 'absolute',
      left: Spacing.sm,
      top: Spacing.sm,
      width: 34,
      height: 34,
      borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
      backgroundColor: DesignColors.surface2,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
      zIndex: 2,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    gap: Spacing.sm,
      padding: Spacing.lg,
    },
    errorText: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
      textAlign: 'center',
    },
    retryButton: {
    borderRadius: Radius.pill,
      backgroundColor: DesignColors.primary,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
  },
    retryText: {
    ...Typography.caption,
      color: DesignColors.onPrimary,
      fontWeight: '700',
    },
    sheetRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
    backgroundColor: DesignColors.surface1,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
    borderWidth: 1,
      borderColor: DesignColors.hairline,
    padding: Spacing.md,
      gap: Spacing.sm,
      paddingBottom: Spacing.xl,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: DesignColors.hairlineStrong,
      marginBottom: 4,
    },
    sheetTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    sheetMeta: {
      ...Typography.bodySm,
    color: DesignColors.inkSubtle,
  },
    statusPill: {
      alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    statusPillText: {
      ...Typography.caption,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    sheetActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    marginTop: Spacing.xs,
    },
    primaryButton: {
      flex: 1,
      borderRadius: Radius.lg,
    backgroundColor: DesignColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
      paddingVertical: 12,
      minHeight: 44,
    },
    primaryButtonText: {
      ...Typography.bodySm,
      color: DesignColors.onPrimary,
      fontWeight: '700',
    },
    secondaryButton: {
      flex: 1,
      borderRadius: Radius.lg,
    borderWidth: 1,
      borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
      paddingVertical: 12,
      minHeight: 44,
  },
    secondaryButtonText: {
      ...Typography.bodySm,
    color: DesignColors.ink,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    bookForm: {
    gap: Spacing.sm,
  },
    bookLabel: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontWeight: '600',
    textTransform: 'uppercase',
    },
    emptyVehiclesText: {
    ...Typography.bodySm,
      color: DesignColors.semanticDanger,
      paddingVertical: Spacing.xs,
    },
    vehicleRow: {
      gap: Spacing.xs,
    },
    vehicleChip: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      minWidth: 110,
    },
    vehicleChipActive: {
      borderColor: DesignColors.primary,
      backgroundColor: `${DesignColors.primary}18`,
    },
    vehicleChipText: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '700',
    },
    vehicleChipTextActive: {
      color: DesignColors.primary,
    },
    vehicleChipSub: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
    arrivalRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    arrivalField: {
      flex: 1,
      gap: 4,
    },
    arrivalFieldLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    arrivalInput: {
      ...Typography.mono,
      fontSize: 14,
      color: DesignColors.ink,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 10,
    },
    arrivalHint: {
      ...Typography.caption,
      color: DesignColors.semanticDanger,
      marginTop: 4,
    },
});
