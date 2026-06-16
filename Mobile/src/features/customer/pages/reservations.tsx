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
import {
  getParkingSlots,
  type ParkingFloor,
} from '@/features/customer/api/parking';
import {
  buildExpectedArrival,
  createReservation,
  getMyReservations,
  type Reservation,
  type ReservationStatus,
} from '@/features/customer/api/reservations';
import {
  FloorSlotsPanel,
  ReservationCard,
  formatReservationDateTime,
  isSlotBookable,
} from '@/features/customer/components';

const ARRIVAL_PRESETS = [
  { minutes: 30, vi: '30 phút', en: '30 min' },
  { minutes: 60, vi: '1 giờ', en: '1 hour' },
  { minutes: 120, vi: '2 giờ', en: '2 hours' },
  { minutes: 180, vi: '3 giờ', en: '3 hours' },
] as const;

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

export default function ReservationsScreen() {
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [overviewFloors, setOverviewFloors] = useState<ParkingFloor[]>([]);
  const [bookingFloors, setBookingFloors] = useState<ParkingFloor[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [arrivalMinutes, setArrivalMinutes] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useProtectedSession();

  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.status?.toUpperCase() !== 'INACTIVE'),
    [vehicles],
  );

  const selectedVehicle = useMemo(
    () => activeVehicles.find((v) => v._id === selectedVehicleId) ?? null,
    [activeVehicles, selectedVehicleId],
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
        const [profile, reservationList, allFloors] = await Promise.all([
          getMyProfile(),
          getMyReservations(statusFilter ?? undefined),
          getParkingSlots(),
        ]);
        setVehicles(profile.vehicles ?? []);
        setReservations(reservationList);
        setOverviewFloors(allFloors);
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

  function openBooking() {
    if (activeVehicles.length === 0) {
      showToast(
        t('Vui lòng đăng ký xe trong Hồ sơ trước', 'Register a vehicle in Profile first'),
        'error',
      );
      return;
    }
    setSelectedVehicleId(activeVehicles[0]._id);
    setArrivalMinutes(60);
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

    setIsSubmitting(true);
    try {
      await createReservation({
        vehicleId: selectedVehicleId,
        parkingSlotId: selectedSlotId,
        expectedArrival: buildExpectedArrival(arrivalMinutes),
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
          <ThemedText style={styles.title}>{t('Đặt chỗ', 'Reservations')}</ThemedText>
          <Pressable
            onPress={openBooking}
            style={({ pressed }) => [styles.bookButton, pressed && styles.buttonPressed]}
          >
            <Ionicons name="add" size={18} color={DesignColors.onPrimary} />
            <ThemedText style={styles.bookButtonText}>{t('Đặt chỗ mới', 'New booking')}</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('Tình trạng bãi đỗ', 'Parking status')}</ThemedText>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.slotAvailable]} />
              <ThemedText style={styles.legendText}>{t('Trống', 'Available')}</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.slotInUse]} />
              <ThemedText style={styles.legendText}>{t('Đang dùng', 'In use')}</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.slotUnavailable]} />
              <ThemedText style={styles.legendText}>{t('Không dùng', 'Unavailable')}</ThemedText>
            </View>
          </View>
          {overviewFloors.length > 0 ? (
            <FloorSlotsPanel
              floors={overviewFloors}
              t={t}
              styles={styles}
              DesignColors={DesignColors}
            />
          ) : (
            <ThemedText style={styles.modalHint}>
              {t('Không có dữ liệu bãi đỗ', 'No parking data')}
            </ThemedText>
          )}
        </View>

        <ThemedText style={styles.sectionTitle}>{t('Đặt chỗ của tôi', 'My reservations')}</ThemedText>

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
                  return (
                    <Pressable
                      key={vehicle._id}
                      onPress={() => setSelectedVehicleId(vehicle._id)}
                      style={({ pressed }) => [
                        styles.typeChip,
                        active && styles.typeChipActive,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <ThemedText style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {vehicle.licensePlate}
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
              <View style={styles.chipRow}>
                {ARRIVAL_PRESETS.map((preset) => {
                  const active = arrivalMinutes === preset.minutes;
                  return (
                    <Pressable
                      key={preset.minutes}
                      onPress={() => setArrivalMinutes(preset.minutes)}
                      style={({ pressed }) => [
                        styles.typeChip,
                        active && styles.typeChipActive,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <ThemedText style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {t(preset.vi, preset.en)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText style={styles.modalHint}>
                {t('Dự kiến', 'Expected')}: {formatReservationDateTime(buildExpectedArrival(arrivalMinutes))}
              </ThemedText>

              <ThemedText style={[styles.fieldLabel, styles.sectionGap]}>
                {t('Chọn chỗ đỗ', 'Select parking slot')}
              </ThemedText>

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
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isSubmitting) && styles.buttonPressed,
                isSubmitting && styles.buttonDisabled,
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
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
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
    title: {
      ...Typography.displayMd,
      color: DesignColors.ink,
      flex: 1,
    },
    bookButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.primary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
    },
    bookButtonText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
    },
    filterRow: {
      gap: Spacing.xs,
      paddingBottom: 2,
    },
    section: {
      gap: Spacing.sm,
    },
    sectionTitle: {
      ...Typography.cardTitle,
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
    fieldLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textTransform: 'uppercase',
    },
    sectionGap: {
      marginTop: Spacing.sm,
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
    typeChipText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
    typeChipTextActive: {
      color: DesignColors.primary,
      fontWeight: '600',
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
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
      alignItems: 'center',
    },
    slotAvailable: {
      borderColor: DesignColors.semanticSuccess,
      backgroundColor: `${DesignColors.semanticSuccess}18`,
    },
    slotInUse: {
      borderColor: '#f59e0b',
      backgroundColor: '#f59e0b18',
    },
    slotUnavailable: {
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      opacity: 0.7,
    },
    slotChipDisabled: {
      opacity: 0.45,
    },
    slotChipActive: {
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface3,
    },
    slotChipText: {
      ...Typography.mono,
      color: DesignColors.inkMuted,
      fontSize: 12,
    },
    slotChipTextActive: {
      color: DesignColors.primary,
      fontWeight: '600',
    },
    slotChipTextDisabled: {
      color: DesignColors.inkMuted,
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
