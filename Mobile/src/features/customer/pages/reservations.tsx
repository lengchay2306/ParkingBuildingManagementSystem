import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useProtectedSession } from '@/hooks/use-protected-session';
import { getMyProfile, type UserVehicle } from '@/lib/auth-api';
import { resolveApiErrorMessage } from '@/lib/api-error';
import {
  getActiveUserParkingSession,
  getParkingSlots,
  type ParkingFloor,
} from '@/features/customer/api/parking';
import {
  formatPricePolicyHourRange,
  formatVnd,
  getAllPricePoliciesForVehicleType,
  type PricePolicy,
} from '@/features/customer/api/payment';
import {
  canCancelReservation,
  cancelReservation,
  createReservation,
  getDefaultExpectedArrivalDate,
  getDefaultExpectedArrivalTime,
  getMyReservations,
  isExpectedArrivalValid,
  parseExpectedArrival,
  type Reservation,
  type ReservationStatus,
} from '@/features/customer/api/reservations';
import {
  FloorSlotsPanel,
  ReservationCard,
  formatReservationDateTime,
  isSlotBookable,
} from '@/features/customer/components';
import {
  getReservationVehicleId,
  getVehicleReserveBlockReasonLocalized,
} from '@/features/customer/lib/parking-validation';

const STATUS_FILTERS: Array<{ value: ReservationStatus | null; vi: string; en: string }> = [
  { value: null, vi: 'Tất cả', en: 'All' },
  { value: 'PENDING', vi: 'Chờ', en: 'Pending' },
  { value: 'CLAIMED', vi: 'Đã nhận', en: 'Claimed' },
  { value: 'EXPIRED', vi: 'Hết hạn', en: 'Expired' },
  { value: 'CANCELLED', vi: 'Đã hủy', en: 'Cancelled' },
];

function resolveVehicleTypeLabel(vehicle: UserVehicle): string | null {
  const type = vehicle.vehicleTypeId;
  if (!type || typeof type === 'string') {
    return null;
  }
  return type.type ?? null;
}

function resolveVehicleTypeId(vehicle: UserVehicle): string | null {
  const type = vehicle.vehicleTypeId;
  if (!type) {
    return null;
  }
  if (typeof type === 'string') {
    return type;
  }
  return type._id ?? null;
}

export default function ReservationsScreen() {
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([]);
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [bookingFloors, setBookingFloors] = useState<ParkingFloor[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [arrivalDate, setArrivalDate] = useState(getDefaultExpectedArrivalDate);
  const [arrivalTime, setArrivalTime] = useState(getDefaultExpectedArrivalTime);
  const [pricePolicies, setPricePolicies] = useState<PricePolicy[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [activeSessionVehicleIds, setActiveSessionVehicleIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

  useProtectedSession();

  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.status?.toUpperCase() !== 'INACTIVE'),
    [vehicles],
  );

  const duplicatePendingCount = useMemo(() => {
    const byVehicle = new Map<string, number>();
    for (const reservation of pendingReservations) {
      const vehicleId = getReservationVehicleId(reservation);
      if (!vehicleId) {
        continue;
      }
      byVehicle.set(vehicleId, (byVehicle.get(vehicleId) ?? 0) + 1);
    }
    let extras = 0;
    byVehicle.forEach((count) => {
      if (count > 1) {
        extras += count - 1;
      }
    });
    return extras;
  }, [pendingReservations]);

  const bookableVehicles = useMemo(
    () =>
      activeVehicles.filter(
        (vehicle) =>
          !getVehicleReserveBlockReasonLocalized(vehicle._id, pendingReservations, t, {
            hasActiveSession: activeSessionVehicleIds.has(vehicle._id),
          }),
      ),
    [activeVehicles, pendingReservations, t, activeSessionVehicleIds],
  );

  const selectedVehicle = useMemo(
    () => bookableVehicles.find((v) => v._id === selectedVehicleId) ?? null,
    [bookableVehicles, selectedVehicleId],
  );

  const loadData = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [profile, reservationList, pendingList] = await Promise.all([
          getMyProfile(),
          getMyReservations(statusFilter ?? undefined, { limit: 100 }),
          getMyReservations('PENDING', { limit: 100 }),
        ]);
        const profileVehicles = profile.vehicles ?? [];
        setVehicles(profileVehicles);
        setReservations(reservationList);
        setPendingReservations(pendingList);

        const activeVehiclesList = profileVehicles.filter(
          (vehicle) => vehicle.status?.toUpperCase() !== 'INACTIVE',
        );
        const sessionEntries = await Promise.all(
          activeVehiclesList.map(async (vehicle) => {
            try {
              const session = await getActiveUserParkingSession(vehicle._id);
              if (session?.status?.toUpperCase() === 'ACTIVE') {
                return vehicle._id;
              }
            } catch {
              // ignore
            }
            return null;
          }),
        );
        setActiveSessionVehicleIds(
          new Set(sessionEntries.filter((id): id is string => Boolean(id))),
        );
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : t('Không tải được dữ liệu', 'Could not load data');
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, t],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadBookingFloors = useCallback(async () => {
    setIsLoadingSlots(true);
    try {
      const result = await getParkingSlots();
      setBookingFloors(result);
    } catch (loadError) {
      showToast(
        loadError instanceof Error
          ? loadError.message
          : t('Không tải được chỗ đỗ', 'Could not load parking slots'),
        'error',
      );
      setBookingFloors([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    if (bookingOpen) {
      setSelectedSlotId(null);
      loadBookingFloors();
    }
  }, [bookingOpen, loadBookingFloors]);

  useEffect(() => {
    if (!bookingOpen || !selectedVehicle || !selectedSlotId) {
      return;
    }
    const vehicleType = resolveVehicleTypeLabel(selectedVehicle);
    const stillValid = bookingFloors.some((floor) =>
      floor.slots.some(
        (slot) => slot._id === selectedSlotId && isSlotBookable(slot, floor, vehicleType),
      ),
    );
    if (!stillValid) {
      setSelectedSlotId(null);
    }
  }, [bookingOpen, selectedVehicle, selectedSlotId, bookingFloors]);

  useEffect(() => {
    if (!bookingOpen || !selectedVehicle) {
      setPricePolicies([]);
      return;
    }
    const vehicleTypeId = resolveVehicleTypeId(selectedVehicle);
    if (!vehicleTypeId) {
      setPricePolicies([]);
      return;
    }
    let cancelled = false;
    setIsLoadingPrices(true);
    void getAllPricePoliciesForVehicleType(vehicleTypeId)
      .then((policies) => {
        if (!cancelled) {
          setPricePolicies(policies);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPricePolicies([]);
          showToast(
            resolveApiErrorMessage(
              error,
              t('Không tải được bảng giá', 'Could not load price policies'),
            ),
            'error',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPrices(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bookingOpen, selectedVehicle, showToast, t]);

  async function handleCancelReservation(reservation: Reservation) {
    if (!canCancelReservation(reservation)) {
      showToast(
        t(
          'Chỉ hủy được khi còn hơn 15 phút trước giờ hẹn.',
          'Can only cancel when more than 15 minutes before arrival.',
        ),
        'error',
      );
      return;
    }

    setCancellingId(reservation._id);
    try {
      await cancelReservation(reservation._id);
      showToast(t('Đã hủy đặt chỗ', 'Reservation cancelled'), 'success');
      await loadData(true);
    } catch (cancelError) {
      showToast(
        cancelError instanceof Error
          ? cancelError.message
          : t('Không hủy được đặt chỗ', 'Could not cancel reservation'),
        'error',
      );
    } finally {
      setCancellingId(null);
    }
  }

  /** Keep the oldest PENDING per vehicle; cancel the rest (cleanup after old multi-book bug). */
  async function handleCleanupDuplicatePending() {
    const byVehicle = new Map<string, Reservation[]>();
    for (const reservation of pendingReservations) {
      const vehicleId = getReservationVehicleId(reservation);
      if (!vehicleId) {
        continue;
      }
      const list = byVehicle.get(vehicleId) ?? [];
      list.push(reservation);
      byVehicle.set(vehicleId, list);
    }

    const toCancel: Reservation[] = [];
    byVehicle.forEach((list) => {
      if (list.length <= 1) {
        return;
      }
      const sorted = [...list].sort((a, b) => {
        const aTime = new Date(a.reservedAt ?? a.expectedArrival ?? 0).getTime();
        const bTime = new Date(b.reservedAt ?? b.expectedArrival ?? 0).getTime();
        return aTime - bTime;
      });
      toCancel.push(...sorted.slice(1));
    });

    if (toCancel.length === 0) {
      showToast(t('Không có đặt chỗ trùng', 'No duplicate reservations'), 'success');
      return;
    }

    setIsCleaningDuplicates(true);
    let cancelled = 0;
    let failed = 0;
    try {
      for (const reservation of toCancel) {
        try {
          if (!canCancelReservation(reservation)) {
            failed += 1;
            continue;
          }
          await cancelReservation(reservation._id);
          cancelled += 1;
        } catch {
          failed += 1;
        }
      }
      if (cancelled > 0) {
        showToast(
          t(
            `Đã hủy ${cancelled} đặt chỗ trùng` + (failed ? ` · ${failed} lỗi` : ''),
            `Cancelled ${cancelled} duplicate(s)` + (failed ? ` · ${failed} failed` : ''),
          ),
          failed ? 'error' : 'success',
        );
      } else {
        showToast(
          t(
            'Không hủy được (có thể còn dưới 15 phút trước giờ hẹn). Đợi hết hạn giữ chỗ hoặc hủy từng cái nếu đủ điều kiện.',
            'Could not cancel (maybe within 15 min of arrival). Wait for hold expiry or cancel individually when allowed.',
          ),
          'error',
        );
      }
      await loadData(true);
    } finally {
      setIsCleaningDuplicates(false);
    }
  }

  function openBooking() {
    if (activeVehicles.length === 0) {
      showToast(
        t('Vui lòng đăng ký xe trong Hồ sơ trước', 'Register a vehicle in Profile first'),
        'error',
      );
      return;
    }
    if (bookableVehicles.length === 0) {
      showToast(
        t(
          'Tất cả xe đã có đặt chỗ đang hoạt động (PENDING).',
          'All vehicles already have an active PENDING reservation.',
        ),
        'error',
      );
      return;
    }
    setSelectedVehicleId(bookableVehicles[0]._id);
    setArrivalDate(getDefaultExpectedArrivalDate());
    setArrivalTime(getDefaultExpectedArrivalTime());
    setSelectedSlotId(null);
    setBookingOpen(true);
  }

  function closeBooking() {
    setBookingOpen(false);
    setSelectedSlotId(null);
    setBookingFloors([]);
  }

  async function handleCreateReservation() {
    if (!selectedVehicleId) {
      showToast(t('Vui lòng chọn xe', 'Please select a vehicle'), 'error');
      return;
    }
    if (!selectedSlotId) {
      showToast(t('Vui lòng chọn chỗ đỗ', 'Please select a parking slot'), 'error');
      return;
    }

    const blockReason = getVehicleReserveBlockReasonLocalized(
      selectedVehicleId,
      pendingReservations,
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
          'Thời gian dự kiến đến phải hợp lệ và ở tương lai',
          'Expected arrival must be valid and in the future',
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
        parkingSlotId: selectedSlotId,
        expectedArrival: expectedArrival.toISOString(),
      });
      showToast(t('Đặt chỗ thành công', 'Reservation created'), 'success');
      closeBooking();
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

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={DesignColors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText style={styles.eyebrow}>PARKASE</ThemedText>
            <ThemedText style={styles.title}>{t('Đặt chỗ', 'Reservations')}</ThemedText>
          </View>
          <Pressable
            onPress={openBooking}
            style={({ pressed }) => [styles.bookButton, pressed && styles.buttonPressed]}
          >
            <Ionicons name="add" size={18} color={DesignColors.onPrimary} />
            <ThemedText style={styles.bookButtonText}>{t('Đặt chỗ mới', 'New booking')}</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.sectionTitle}>{t('Đặt chỗ của tôi', 'My reservations')}</ThemedText>

        {__DEV__ && duplicatePendingCount > 0 ? (
          <Pressable
            onPress={handleCleanupDuplicatePending}
            disabled={isCleaningDuplicates}
            style={({ pressed }) => [
              styles.cleanupButton,
              pressed && styles.buttonPressed,
              isCleaningDuplicates && styles.buttonDisabled,
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={DesignColors.onPrimary} />
            <ThemedText style={styles.cleanupButtonText}>
              {isCleaningDuplicates
                ? t('Đang dọn…', 'Cleaning…')
                : t(
                    `Dọn ${duplicatePendingCount} chỗ đặt trùng (giữ 1/xe)`,
                    `Clean ${duplicatePendingCount} duplicate(s) (keep 1/vehicle)`,
                  )}
            </ThemedText>
          </Pressable>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <Pressable
                key={filter.value ?? 'all'}
                onPress={() => setStatusFilter(filter.value)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && styles.buttonPressed,
                ]}
              >
                <ThemedText style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {t(filter.vi, filter.en)}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={DesignColors.primary} style={styles.loader} />
        ) : error ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>{error}</ThemedText>
            <Pressable
              onPress={() => loadData()}
              style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
            >
              <ThemedText style={styles.retryButtonText}>{t('Thử lại', 'Retry')}</ThemedText>
            </Pressable>
          </View>
        ) : reservations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={DesignColors.inkMuted} />
            <ThemedText style={styles.emptyText}>
              {t('Chưa có đặt chỗ nào', 'No reservations yet')}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {reservations.map((reservation) => (
              <ReservationCard
                key={reservation._id}
                reservation={reservation}
                t={t}
                styles={styles}
                DesignColors={DesignColors}
                onCancel={handleCancelReservation}
                isCancelling={cancellingId === reservation._id}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={bookingOpen} animationType="slide" transparent onRequestClose={closeBooking}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeBooking} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{t('Đặt chỗ mới', 'New booking')}</ThemedText>
              <Pressable
                onPress={closeBooking}
                style={({ pressed }) => [styles.modalClose, pressed && styles.buttonPressed]}
              >
                <Ionicons name="close" size={18} color={DesignColors.inkMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <ThemedText style={styles.fieldLabel}>{t('Chọn xe', 'Select vehicle')}</ThemedText>
              <View style={styles.chipRow}>
                {activeVehicles.map((vehicle) => {
                  const active = selectedVehicleId === vehicle._id;
                  const blockReason = getVehicleReserveBlockReasonLocalized(
                    vehicle._id,
                    pendingReservations,
                    t,
                    { hasActiveSession: activeSessionVehicleIds.has(vehicle._id) },
                  );
                  const disabled = !!blockReason;
                  return (
                    <Pressable
                      key={vehicle._id}
                      disabled={disabled}
                      onPress={() => setSelectedVehicleId(vehicle._id)}
                      style={({ pressed }) => [
                        styles.typeChip,
                        active && styles.typeChipActive,
                        disabled && styles.typeChipDisabled,
                        pressed && !disabled && styles.buttonPressed,
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.typeChipText,
                          active && styles.typeChipTextActive,
                          disabled && styles.typeChipTextDisabled,
                        ]}
                      >
                        {vehicle.licensePlate}
                        {disabled ? ` · ${t('Đã đặt', 'Booked')}` : ''}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {selectedVehicle ? (
                <ThemedText style={styles.modalHint}>
                  {t('Loại xe', 'Vehicle type')}: {resolveVehicleTypeLabel(selectedVehicle) ?? '—'} ·{' '}
                  {t(
                    'Chỉ chọn được chỗ trống ở tầng cùng loại xe',
                    'Only available slots on matching floors can be selected',
                  )}
                </ThemedText>
              ) : null}

              <ThemedText style={[styles.fieldLabel, styles.sectionGap]}>
                {t('Thời gian dự kiến đến', 'Expected arrival')}
              </ThemedText>
              <View style={styles.arrivalInputsRow}>
                <View style={styles.arrivalField}>
                  <ThemedText style={styles.arrivalFieldLabel}>{t('Ngày', 'Date')}</ThemedText>
                  <TextInput
                    value={arrivalDate}
                    onChangeText={setArrivalDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={DesignColors.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
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
                    autoCorrect={false}
                    style={styles.arrivalInput}
                  />
                </View>
              </View>
              <ThemedText
                style={[
                  styles.modalHint,
                  !isExpectedArrivalValid(arrivalDate, arrivalTime) && styles.arrivalInvalidHint,
                ]}
              >
                {isExpectedArrivalValid(arrivalDate, arrivalTime)
                  ? `${t('Dự kiến', 'Expected')}: ${formatReservationDateTime(
                      parseExpectedArrival(arrivalDate, arrivalTime)!.toISOString(),
                    )}`
                  : t(
                      'Nhập ngày/giờ tương lai (YYYY-MM-DD · HH:mm)',
                      'Enter a future date/time (YYYY-MM-DD · HH:mm)',
                    )}
              </ThemedText>

              {selectedVehicle ? (
                <View style={styles.pricePanel}>
                  <ThemedText style={styles.priceTitle}>
                    {t('Bảng giá', 'Price rates')} · {resolveVehicleTypeLabel(selectedVehicle) ?? '—'}
                  </ThemedText>
                  {isLoadingPrices ? (
                    <ActivityIndicator color={DesignColors.primary} />
                  ) : pricePolicies.length === 0 ? (
                    <ThemedText style={styles.modalHint}>
                      {t('Chưa có bảng giá cho loại xe này', 'No price policy for this vehicle type')}
                    </ThemedText>
                  ) : (
                    <View style={styles.priceList}>
                      {pricePolicies.map((policy) => (
                        <View key={policy._id} style={styles.priceRow}>
                          <ThemedText style={styles.priceLabel}>
                            {policy.monthlyRate != null
                              ? t('Theo tháng', 'Monthly')
                              : formatPricePolicyHourRange(policy.fromHour, policy.toHour)}
                          </ThemedText>
                          <ThemedText style={styles.priceValue}>
                            {policy.monthlyRate != null
                              ? formatVnd(policy.monthlyRate)
                              : `${formatVnd(policy.ratePerHour)}/${t('giờ', 'h')}`}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}

              <ThemedText style={[styles.fieldLabel, styles.sectionGap]}>
                {t('Chọn chỗ đỗ', 'Select parking slot')}
              </ThemedText>

              <View style={styles.slotLegendRow}>
                {(
                  [
                    [DesignColors.semanticSuccess, t('Trống', 'Free')],
                    [DesignColors.semanticWarning, t('Đã đặt', 'Reserved')],
                    [DesignColors.accentSky, t('Đang dùng', 'In use')],
                    [DesignColors.semanticDanger, t('Khóa', 'Blocked')],
                  ] as const
                ).map(([color, label]) => (
                  <View key={label} style={styles.slotLegendItem}>
                    <View style={[styles.slotLegendDot, { backgroundColor: color }]} />
                    <ThemedText style={styles.slotLegendText}>{label}</ThemedText>
                  </View>
                ))}
              </View>

              {isLoadingSlots ? (
                <ActivityIndicator color={DesignColors.primary} style={styles.typeLoader} />
              ) : bookingFloors.length === 0 ? (
                <ThemedText style={styles.modalHint}>
                  {t('Không có dữ liệu chỗ đỗ', 'No parking slot data')}
                </ThemedText>
              ) : (
                <FloorSlotsPanel
                  floors={bookingFloors}
                  t={t}
                  styles={styles}
                  DesignColors={DesignColors}
                  selectable
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={setSelectedSlotId}
                  vehicleType={selectedVehicle ? resolveVehicleTypeLabel(selectedVehicle) : null}
                />
              )}
            </ScrollView>

            <Pressable
              onPress={handleCreateReservation}
              disabled={
                isSubmitting ||
                !selectedVehicleId ||
                !selectedSlotId ||
                !isExpectedArrivalValid(arrivalDate, arrivalTime)
              }
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isSubmitting) && styles.buttonPressed,
                (isSubmitting ||
                  !selectedVehicleId ||
                  !selectedSlotId ||
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
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

function createStyles(DesignColors: DesignColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    scrollContent: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.section,
      paddingBottom: Spacing.xl,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
      gap: Spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    headerText: {
      flex: 1,
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
    bookButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: Radius.md,
      backgroundColor: DesignColors.primary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
    },
    bookButtonText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
    },
    cleanupButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: Radius.md,
      backgroundColor: DesignColors.semanticDanger,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
    },
    cleanupButtonText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
      flexShrink: 1,
    },
    filterRow: {
      gap: Spacing.xs,
      paddingBottom: 2,
    },
    section: {
      gap: Spacing.sm,
    },
    sectionTitle: {
      ...Typography.button,
      color: DesignColors.ink,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 3,
      borderWidth: 1,
    },
    legendText: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    floorList: {
      gap: Spacing.sm,
    },
    filterChip: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    filterChipActive: {
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface3,
    },
    filterChipText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
    filterChipTextActive: {
      color: DesignColors.primary,
      fontWeight: '600',
    },
    loader: {
      marginTop: Spacing.xl,
    },
    emptyState: {
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.xl,
    },
    emptyText: {
      ...Typography.body,
      color: DesignColors.inkMuted,
      textAlign: 'center',
    },
    retryButton: {
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
    },
    retryButtonText: {
      ...Typography.button,
      color: DesignColors.primary,
    },
    list: {
      gap: Spacing.sm,
    },
    reservationCard: {
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      padding: Spacing.md,
      gap: Spacing.xs,
    },
    reservationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      marginBottom: 4,
    },
    plateBadge: {
      borderRadius: Radius.sm,
      backgroundColor: DesignColors.surface2,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    plateText: {
      ...Typography.mono,
      color: DesignColors.ink,
      letterSpacing: 0.5,
    },
    statusPill: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    statusPillText: {
      ...Typography.caption,
      fontWeight: '600',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: Spacing.md,
      paddingVertical: 2,
    },
    infoLabel: {
      ...Typography.bodySm,
      color: DesignColors.inkSubtle,
      flex: 1,
    },
    infoValue: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      flex: 1,
      textAlign: 'right',
    },
    cancelButton: {
      marginTop: Spacing.xs,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.semanticDanger,
      backgroundColor: `${DesignColors.semanticDanger}14`,
      paddingVertical: 10,
      alignItems: 'center',
    },
    cancelButtonText: {
      ...Typography.button,
      color: DesignColors.semanticDanger,
      fontWeight: '600',
    },
    cancelButtonDisabled: {
      opacity: 0.45,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
      maxHeight: '88%',
      borderTopLeftRadius: Radius.lg,
      borderTopRightRadius: Radius.lg,
      backgroundColor: DesignColors.surface1,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    modalTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      flex: 1,
    },
    modalClose: {
      width: 32,
      height: 32,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.surface2,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    modalBody: {
      gap: Spacing.sm,
      paddingBottom: Spacing.sm,
    },
    modalHint: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    arrivalInvalidHint: {
      color: DesignColors.semanticDanger,
    },
    arrivalInputsRow: {
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
    pricePanel: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      padding: Spacing.sm,
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    priceTitle: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '600',
    },
    priceList: {
      gap: 6,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    priceLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      flex: 1,
    },
    priceValue: {
      ...Typography.caption,
      color: DesignColors.ink,
      fontWeight: '600',
    },
    fieldLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textTransform: 'uppercase',
    },
    sectionGap: {
      marginTop: Spacing.sm,
    },
    slotLegendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: 2,
    },
    slotLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    slotLegendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    slotLegendText: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 12,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    typeLoader: {
      alignSelf: 'flex-start',
      marginVertical: Spacing.xs,
    },
    typeChip: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    typeChipActive: {
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface3,
    },
    typeChipDisabled: {
      opacity: 0.45,
    },
    typeChipText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
    typeChipTextActive: {
      color: DesignColors.primary,
      fontWeight: '600',
    },
    typeChipTextDisabled: {
      color: DesignColors.inkMuted,
    },
    floorBlock: {
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      overflow: 'hidden',
      marginTop: Spacing.xs,
    },
    floorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.sm,
      gap: Spacing.sm,
    },
    floorHeaderText: {
      flex: 1,
      gap: 2,
    },
    floorName: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '600',
    },
    floorStats: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    slotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingBottom: Spacing.sm,
    },
    slotChip: {
      minWidth: 52,
      borderRadius: Radius.sm,
      borderWidth: 1.5,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
    },
    slotChipDisabled: {
      opacity: 0.4,
    },
    slotChipActive: {
      borderColor: DesignColors.primaryHover,
      backgroundColor: `${DesignColors.primary}40`,
    },
    slotChipText: {
      ...Typography.mono,
      color: DesignColors.inkMuted,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
      includeFontPadding: false,
    },
    slotChipTextActive: {
      color: DesignColors.ink,
    },
    slotChipTextDisabled: {
      color: DesignColors.inkSubtle,
    },
    primaryButton: {
      borderRadius: Radius.md,
      backgroundColor: DesignColors.primary,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    primaryButtonText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
}
