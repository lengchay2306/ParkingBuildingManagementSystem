import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, Typography } from '@/constants/design';
import {
  StaffDarkCard,
  StaffSessionDetailGrid,
  StaffStatusBadge,
  type StaffDetailCell,
} from '@/features/staff/components/premium';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffBackButton } from '@/features/staff/components/staff-back-button';
import {
  createHiddenStaffTabBarStyle,
  createStaffTabBarStyle,
} from '@/features/staff/components/staff-tab-bar';
import {
  HeroDestination,
  type HeroDestinationHandle,
} from '@/features/staff/components/hero-destination';
import {
  SLOT_HEADER_BORDER_RADIUS,
  SlotHeroVisual,
} from '@/features/staff/components/slot-hero-visual';
import {
  createParkingSession,
  getParkingSlots,
  getPendingReservationBySlot,
  type ParkingFloor,
  type ParkingSlotStatus,
  type Reservation,
} from '@/features/staff/api';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import {
  getReservationDriverName,
  getReservationDriverPhone,
  getReservationPlate,
  getReservationVehicleType,
} from '@/features/staff/lib/reservation-helpers';
import {
  formatDurationFrom,
  formatTimeLabel,
  mapParkingSessionToRecord,
  resolveSessionCustomerLabel,
  resolveSlotLabel,
} from '@/features/staff/lib/utils';
import { useHeroTransition } from '@/features/staff/motion/hero-transition-context';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { isNotFoundApiError, resolveApiErrorMessage } from '@/lib/api-error';
import { staffSlotSessionDetailPath } from '@/roles';

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

function resolveStatusTone(status: ParkingSlotStatus | string) {
  if (status === 'CURRENTLY-IN-USED') {
    return 'occupied' as const;
  }
  if (status === 'RESERVED') {
    return 'reserved' as const;
  }
  if (status === 'UNAVAILABLE') {
    return 'neutral' as const;
  }
  return 'available' as const;
}

function resolveAccentBorder(tone: ReturnType<typeof resolveStatusTone>) {
  if (tone === 'available') {
    return 'success' as const;
  }
  if (tone === 'occupied') {
    return 'warning' as const;
  }
  if (tone === 'reserved') {
    return 'info' as const;
  }
  return 'none' as const;
}

function resolveVehicleIcon(vehicleType?: string): keyof typeof Ionicons.glyphMap {
  const normalized = (vehicleType ?? '').toUpperCase();
  if (normalized.includes('BIKE') || normalized.includes('MOTOR')) {
    return 'bicycle-outline';
  }
  if (normalized.includes('TRUCK') || normalized.includes('BUS')) {
    return 'bus-outline';
  }
  return 'car-outline';
}

export default function StaffSlotDetailScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { slotId, floorId, floorName, slotNumber } = useLocalSearchParams<{
    slotId: string;
    floorId?: string;
    floorName?: string;
    slotNumber?: string;
  }>();
  const { t } = useLanguagePreference();
  const { showToast } = useAppToast();
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const localStyles = useMemo(() => createLocalStyles(DesignColors), [DesignColors]);
  const {
    activeSessionsBySlotId,
    loadActiveSlotSessions,
    loadParkingSlots,
    recordCheckIn,
  } = useStaffWorkspace();
  const { reverseHero, canReverseHero, isAnimating } = useHeroTransition();
  const heroRef = useRef<HeroDestinationHandle>(null);
  const [floors, setFloors] = useState<ParkingFloor[]>([]);
  const [pendingReservation, setPendingReservation] = useState<Reservation | null>(null);
  const [isLoadingReservation, setIsLoadingReservation] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const pageOpacity = useSharedValue(1);
  const pageTranslateY = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      const filters = floorId ? { floorId: String(floorId) } : {};
      void getParkingSlots(filters)
        .then(setFloors)
        .catch((error) => {
          setFloors([]);
          showToast(
            resolveApiErrorMessage(
              error,
              t('Không tải được chỗ đỗ', 'Could not load parking spots'),
            ),
            'error',
          );
        });
      void loadActiveSlotSessions().catch((error) => {
        showToast(
          resolveApiErrorMessage(
            error,
            t('Không tải được phiên đang gửi', 'Could not load active sessions'),
          ),
          'error',
        );
      });
    }, [floorId, loadActiveSlotSessions, showToast, t]),
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
  const resolvedFloorName = slotContext?.floorName ?? floorName ?? '—';
  const resolvedSlotNumber = slotContext?.slot.slotNumber ?? slotNumber ?? '—';
  const resolvedStatus = slotContext?.slot.status ?? 'AVAILABLE';

  useFocusEffect(
    useCallback(() => {
      if (resolvedStatus !== 'RESERVED' || !slotId) {
        setPendingReservation(null);
        setIsLoadingReservation(false);
        return;
      }

      let alive = true;
      setIsLoadingReservation(true);
      void getPendingReservationBySlot(String(slotId))
        .then((reservation) => {
          if (alive) {
            setPendingReservation(reservation);
          }
        })
        .catch((error) => {
          if (alive) {
            setPendingReservation(null);
            if (!isNotFoundApiError(error)) {
              showToast(
                resolveApiErrorMessage(
                  error,
                  t('Không tải được đặt chỗ', 'Could not load reservation'),
                ),
                'error',
              );
            }
          }
        })
        .finally(() => {
          if (alive) {
            setIsLoadingReservation(false);
          }
        });

      return () => {
        alive = false;
      };
    }, [resolvedStatus, showToast, slotId, t]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      animation: 'none',
      gestureEnabled: !isExiting && !isAnimating,
    });
  }, [isAnimating, isExiting, navigation]);

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

  useFocusEffect(
    useCallback(() => {
      hideTabBar();
      return restoreTabBar;
    }, [hideTabBar, restoreTabBar]),
  );

  const vehicleType = slotContext?.vehicleType;
  const statusLabel = resolveStatusLabel(resolvedStatus, t);
  const statusTone = resolveStatusTone(resolvedStatus);
  const reservationPlate = pendingReservation ? getReservationPlate(pendingReservation) : undefined;
  const reservationDriver = pendingReservation
    ? getReservationDriverName(pendingReservation)
    : undefined;
  const reservationPhone = pendingReservation
    ? getReservationDriverPhone(pendingReservation)
    : undefined;
  const reservationVehicleType = pendingReservation
    ? getReservationVehicleType(pendingReservation)
    : undefined;

  const detailCells = useMemo<StaffDetailCell[]>(
    () => [
      {
        id: 'floor',
        icon: 'layers-outline',
        label: t('Tầng', 'Floor'),
        value: resolvedFloorName,
      },
      {
        id: 'slot',
        icon: 'grid-outline',
        label: t('Mã ô', 'Slot'),
        value: resolvedSlotNumber,
      },
      {
        id: 'vehicle',
        icon: resolveVehicleIcon(vehicleType),
        label: t('Loại xe tầng', 'Floor type'),
        value: vehicleType ?? '—',
      },
      {
        id: 'status',
        icon: 'ellipse-outline',
        label: t('Trạng thái', 'Status'),
        value: statusLabel,
      },
    ],
    [resolvedFloorName, resolvedSlotNumber, statusLabel, t, vehicleType],
  );

  const sessionCells = useMemo<StaffDetailCell[]>(() => {
    if (!activeSession) {
      return [];
    }
    return [
      {
        id: 'plate',
        icon: 'car-sport-outline',
        label: t('Biển số', 'Plate'),
        value: activeSession.plate,
      },
      {
        id: 'customer',
        icon: 'person-outline',
        label: t('Khách hàng', 'Customer'),
        value: resolveSessionCustomerLabel(activeSession, t),
      },
      {
        id: 'phone',
        icon: 'call-outline',
        label: t('Số điện thoại', 'Phone'),
        value: activeSession.customerPhone ?? '—',
      },
      {
        id: 'duration',
        icon: 'time-outline',
        label: t('Thời lượng', 'Duration'),
        value: formatDurationFrom(activeSession.checkInTime),
      },
    ];
  }, [activeSession, t]);

  const reservationCells = useMemo<StaffDetailCell[]>(() => {
    if (!pendingReservation) {
      return [];
    }
    return [
      {
        id: 'customer',
        icon: 'person-outline',
        label: t('Khách hàng', 'Customer'),
        value: reservationDriver ?? t('Chưa rõ', 'Unknown'),
      },
      {
        id: 'phone',
        icon: 'call-outline',
        label: t('Số điện thoại', 'Phone'),
        value: reservationPhone ?? '—',
      },
      {
        id: 'arrival',
        icon: 'time-outline',
        label: t('Giờ đến dự kiến', 'Expected arrival'),
        value: pendingReservation.expectedArrival
          ? formatTimeLabel(pendingReservation.expectedArrival)
          : '—',
      },
      {
        id: 'expiry',
        icon: 'hourglass-outline',
        label: t('Hết hạn giữ chỗ', 'Hold expires'),
        value: pendingReservation.expiryAt ? formatTimeLabel(pendingReservation.expiryAt) : '—',
      },
    ];
  }, [pendingReservation, reservationDriver, reservationPhone, t]);

  const pageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pageOpacity.value,
    transform: [{ translateY: pageTranslateY.value }],
  }));

  const handleReservedCheckIn = useCallback(async () => {
    if (!pendingReservation || isCheckingIn) {
      return;
    }

    setIsCheckingIn(true);
    try {
      const session = await createParkingSession({ reservationId: pendingReservation._id });
      const refreshedFloors = await loadParkingSlots();
      const record = mapParkingSessionToRecord(session, refreshedFloors);
      const plate = reservationPlate ?? record.plate;
      recordCheckIn({
        ...record,
        plate: plate !== '—' ? plate : record.plate,
        slotLabel: resolveSlotLabel(session.parkingSlotId, refreshedFloors) || record.slotLabel,
        slotId: String(slotId),
      });
      void loadActiveSlotSessions(refreshedFloors).catch((error) => {
        showToast(
          resolveApiErrorMessage(
            error,
            t('Không làm mới trạng thái ô', 'Could not refresh spot status'),
          ),
          'error',
        );
      });
      showToast(t('Check-in thành công', 'Check-in successful'), 'success');
      router.replace(staffSlotSessionDetailPath(session._id) as never);
    } catch (error) {
      showToast(
        resolveApiErrorMessage(error, t('Check-in thất bại', 'Check-in failed')),
        'error',
      );
    } finally {
      setIsCheckingIn(false);
    }
  }, [
    isCheckingIn,
    loadActiveSlotSessions,
    loadParkingSlots,
    pendingReservation,
    recordCheckIn,
    reservationPlate,
    router,
    showToast,
    slotId,
    t,
  ]);

  const handleBack = useCallback(async () => {
    if (isExiting || isAnimating) {
      return;
    }

    setIsExiting(true);
    const goBack = () => router.back();

    if (canReverseHero(slotId) && heroRef.current) {
      try {
        const from = await heroRef.current.measure();
        // Hide page content immediately so only the flying hero is visible.
        pageOpacity.value = 0;
        pageTranslateY.value = 0;
        const started = reverseHero(slotId, from, goBack);
        if (started) {
          return;
        }
      } catch {
        // fall through
      }
    }

    const exitTiming = { duration: 280, easing: Easing.in(Easing.cubic) };
    pageOpacity.value = withTiming(0, exitTiming);
    pageTranslateY.value = withTiming(18, exitTiming);
    setTimeout(goBack, 260);
  }, [
    canReverseHero,
    isAnimating,
    isExiting,
    pageOpacity,
    pageTranslateY,
    reverseHero,
    router,
    slotId,
  ]);

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={[{ flex: 1 }, pageAnimatedStyle]}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: Spacing.sm,
            paddingHorizontal: Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
            gap: Spacing.lg,
          }}
          showsVerticalScrollIndicator={false}>
          <StaffBackButton
            disabled={isExiting || isAnimating}
            label={t('Quay lại', 'Back')}
            onPress={() => {
              void handleBack();
            }}
          />

          <HeroDestination
            ref={heroRef}
            heroId={slotId}
            borderRadius={SLOT_HEADER_BORDER_RADIUS}>
            <SlotHeroVisual
              floorName={resolvedFloorName}
              slotNumber={resolvedSlotNumber}
              status={resolvedStatus}
              variant="header"
            />
          </HeroDestination>

          <StaffDarkCard accentBorder={resolveAccentBorder(statusTone)} index={0}>
            <View style={localStyles.sectionHeader}>
              <View style={localStyles.sectionTitleRow}>
                <Ionicons color={DesignColors.primary} name="information-circle-outline" size={18} />
                <ThemedText style={localStyles.sectionTitle}>
                  {t('Chi tiết ô', 'Slot details')}
                </ThemedText>
              </View>
              <StaffStatusBadge label={statusLabel} tone={statusTone} />
            </View>
            <StaffSessionDetailGrid cells={detailCells} />
          </StaffDarkCard>

          {resolvedStatus === 'RESERVED' ? (
            <StaffDarkCard accentBorder="info" index={1}>
              <View style={localStyles.sectionHeader}>
                <View style={localStyles.sectionTitleRow}>
                  <Ionicons color={DesignColors.accentSky} name="calendar-outline" size={18} />
                  <ThemedText style={localStyles.sectionTitle}>
                    {t('Đặt chỗ', 'Reservation')}
                  </ThemedText>
                </View>
                <StaffStatusBadge label={t('RESERVED', 'RESERVED')} tone="reserved" />
              </View>

              {isLoadingReservation ? (
                <ThemedText style={localStyles.hintText}>
                  {t('Đang tải thông tin đặt chỗ…', 'Loading reservation…')}
                </ThemedText>
              ) : pendingReservation ? (
                <>
                  <View style={localStyles.plateHero}>
                    <ThemedText style={localStyles.plateLabel}>{t('Biển số', 'Plate')}</ThemedText>
                    <ThemedText style={localStyles.plateValue}>
                      {reservationPlate ?? '—'}
                    </ThemedText>
                    <ThemedText style={localStyles.plateMeta}>
                      {reservationVehicleType
                        ? `${t('Loại xe', 'Vehicle')}: ${reservationVehicleType}`
                        : t('Khách đã đặt trước ô này', 'Customer reserved this spot')}
                    </ThemedText>
                  </View>

                  <StaffSessionDetailGrid cells={reservationCells} />

                  <StaffActionButton
                    disabled={isCheckingIn}
                    label={t('Check-in vào ô này', 'Check in to this spot')}
                    loading={isCheckingIn}
                    onPress={() => {
                      void handleReservedCheckIn();
                    }}
                    style={styles.fullWidthButton}
                    variant="primary"
                  />
                </>
              ) : (
                <View style={localStyles.hintRow}>
                  <Ionicons color={DesignColors.accentSky} name="alert-circle-outline" size={20} />
                  <ThemedText style={localStyles.hintText}>
                    {t(
                      'Ô đang RESERVED nhưng không tìm thấy đặt chỗ PENDING. Dùng tab Quét để check-in bằng biển số, hoặc refresh Spots.',
                      'Slot is RESERVED but no PENDING reservation was found. Use Scan tab to check in by plate, or refresh Spots.',
                    )}
                  </ThemedText>
                </View>
              )}
            </StaffDarkCard>
          ) : null}

          {activeSession ? (
            <StaffDarkCard accentBorder="warning" index={1}>
              <View style={localStyles.sectionHeader}>
                <View style={localStyles.sectionTitleRow}>
                  <Ionicons color={DesignColors.accentAmber} name="car-outline" size={18} />
                  <ThemedText style={localStyles.sectionTitle}>
                    {t('Xe đang gửi', 'Parked vehicle')}
                  </ThemedText>
                </View>
                <StaffStatusBadge label={t('ACTIVE', 'ACTIVE')} tone="active" />
              </View>

              <View style={localStyles.plateHero}>
                <ThemedText style={localStyles.plateLabel}>{t('Biển số', 'Plate')}</ThemedText>
                <ThemedText style={localStyles.plateValue}>{activeSession.plate}</ThemedText>
                <ThemedText style={localStyles.plateMeta}>
                  {t('Giờ vào', 'Entry')}: {activeSession.timeLabel}
                  {activeSession.vehicleType ? ` · ${activeSession.vehicleType}` : ''}
                </ThemedText>
              </View>

              <StaffSessionDetailGrid cells={sessionCells} />

              <StaffActionButton
                label={t('Xem phiên gửi xe', 'View parking session')}
                onPress={() => router.push(staffSlotSessionDetailPath(activeSession.id) as never)}
                style={styles.fullWidthButton}
                variant="secondary"
              />
            </StaffDarkCard>
          ) : resolvedStatus === 'CURRENTLY-IN-USED' ? (
            <StaffDarkCard accentBorder="warning" index={1}>
              <View style={localStyles.hintRow}>
                <Ionicons color={DesignColors.accentAmber} name="alert-circle-outline" size={20} />
                <ThemedText style={localStyles.hintText}>
                  {t(
                    'Ô đang đánh dấu gửi xe nhưng chưa tìm thấy phiên ACTIVE (có thể phiên cũ/lệch dữ liệu). Kéo refresh tab Spots hoặc Sessions.',
                    'Slot is marked in use but no ACTIVE session was found (stale status or data mismatch). Refresh Spots or Sessions.',
                  )}
                </ThemedText>
              </View>
            </StaffDarkCard>
          ) : null}
        </ScrollView>
      </Animated.View>
    </ThemedView>
  );
}

function createLocalStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      flexShrink: 1,
    },
    sectionTitle: {
      ...Typography.subhead,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 17,
    },
    plateHero: {
      backgroundColor: DesignColors.surface2,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      gap: 4,
      marginBottom: Spacing.sm,
    },
    plateLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontSize: 10,
    },
    plateValue: {
      ...Typography.headline,
      color: DesignColors.ink,
      fontWeight: '700',
      letterSpacing: 1,
    },
    plateMeta: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    hintText: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
      flex: 1,
      lineHeight: 20,
    },
  });
}
