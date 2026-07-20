import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import {
  StaffDarkCard,
  StaffFilterDropdown,
  type StaffFilterOption,
} from '@/features/staff/components/premium';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { StaffTextInput } from '@/features/staff/components/staff-text-input';
import {
  deleteManagedReservation,
  getActiveSessionByPlate,
  getStaffActiveParkingSessions,
  getUserById,
  listPendingReservations,
  resolveOwnerUserId,
  type ParkingSession,
  type Reservation,
} from '@/features/staff/api';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { formatLicensePlateForApi } from '@/features/staff/lib/license-plate-ocr';
import {
  formatReservationSlotLabel,
  getReservationDriverName,
  getReservationPlate,
} from '@/features/staff/lib/reservation-helpers';
import {
  validateStaffPhoneInput,
} from '@/features/staff/lib/session-validation';
import { useStaffScreenTitles } from '@/features/staff/lib/staff-screen-titles';
import {
  mapParkingSessionToRecord,
  type StaffCheckInRecord,
} from '@/features/staff/lib/utils';
import { useLanguagePreference } from '@/hooks/language-preference';
import { resolveApiErrorMessage } from '@/lib/api-error';
import { resolveParkingSessionApiMessage } from '@/features/staff/lib/parking-session-api-message';
import { useThemePreference } from '@/hooks/theme-preference';
import { staffSessionDetailPath } from '@/roles';

const EMPTY_SELECTION = '' as const;

async function toMonthlySessionRecord(
  session: ParkingSession,
  floors: Parameters<typeof mapParkingSessionToRecord>[1],
): Promise<StaffCheckInRecord> {
  const record = mapParkingSessionToRecord(session, floors);
  if (record.customerPhone?.trim()) {
    return record;
  }

  const userId = resolveOwnerUserId(
    typeof session.checkInUserId === 'string'
      ? session.checkInUserId
      : session.checkInUserId
        ? { _id: session.checkInUserId._id }
        : null,
  );
  if (!userId) {
    return record;
  }

  try {
    const user = await getUserById(userId);
    return {
      ...record,
      customerName: user.fullName?.trim() || record.customerName,
      customerPhone: user.phone?.trim() || record.customerPhone,
    };
  } catch {
    return record;
  }
}

export default function StaffOperationsScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const titles = useStaffScreenTitles();
  const DesignColors = useStaffDesignColors();
  const { resolvedScheme } = useThemePreference();
  const isDark = resolvedScheme === 'dark';
  const styles = useMemo(() => createStyles(DesignColors, isDark), [DesignColors, isDark]);
  const { checkoutSession, floors, loadParkingSessions, loadParkingSlots } = useStaffWorkspace();

  const [checkoutPlate, setCheckoutPlate] = useState('');
  const [isLookingUpPlate, setIsLookingUpPlate] = useState(false);

  const [activeSessions, setActiveSessions] = useState<StaffCheckInRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(EMPTY_SELECTION);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([]);
  const [selectedReservationId, setSelectedReservationId] = useState<string>(EMPTY_SELECTION);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [isDeletingReservation, setIsDeletingReservation] = useState(false);

  const reloadPickers = useCallback(async () => {
    setIsLoadingSessions(true);
    setIsLoadingReservations(true);
    try {
      let floorSnapshot = floors;
      if (floorSnapshot.length === 0) {
        floorSnapshot = await loadParkingSlots();
      }

      const [sessionsResult, reservationsResult] = await Promise.allSettled([
        getStaffActiveParkingSessions().then(async (items) => {
          const monthly = items.filter((session) => session.sessionType?.toUpperCase() === 'MONTH');
          return Promise.all(monthly.map((session) => toMonthlySessionRecord(session, floorSnapshot)));
        }),
        listPendingReservations(),
      ]);

      if (sessionsResult.status === 'fulfilled') {
        setActiveSessions(sessionsResult.value);
        setSelectedSessionId((current) =>
          current && sessionsResult.value.some((session) => session.id === current)
            ? current
            : EMPTY_SELECTION,
        );
      } else {
        setActiveSessions([]);
        showToast(
          resolveApiErrorMessage(
            sessionsResult.reason,
            t('Không tải được phiên thẻ tháng', 'Could not load monthly sessions'),
          ),
          'error',
        );
      }

      if (reservationsResult.status === 'fulfilled') {
        setPendingReservations(reservationsResult.value);
        setSelectedReservationId((current) =>
          current && reservationsResult.value.some((reservation) => reservation._id === current)
            ? current
            : EMPTY_SELECTION,
        );
      } else {
        setPendingReservations([]);
        showToast(
          resolveApiErrorMessage(
            reservationsResult.reason,
            t('Không tải được đặt chỗ PENDING', 'Could not load PENDING reservations'),
          ),
          'error',
        );
      }
    } catch (error) {
      showToast(
        resolveApiErrorMessage(error, t('Không tải được dữ liệu', 'Could not load data')),
        'error',
      );
    } finally {
      setIsLoadingSessions(false);
      setIsLoadingReservations(false);
    }
  }, [floors, loadParkingSlots, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void reloadPickers();
    }, [reloadPickers]),
  );

  const sessionOptions = useMemo<StaffFilterOption<string>[]>(() => {
    return activeSessions.map((session) => {
      const nameHint = session.customerName ? ` · ${session.customerName}` : '';
      return {
        id: session.id,
        label: `${session.plate} · ${session.slotLabel}${nameHint}`,
      };
    });
  }, [activeSessions]);

  const reservationOptions = useMemo<StaffFilterOption<string>[]>(() => {
    return pendingReservations.map((reservation) => {
      const plate = getReservationPlate(reservation) ?? '—';
      const slot = formatReservationSlotLabel(reservation);
      const driver = getReservationDriverName(reservation);
      return {
        id: reservation._id,
        label: driver ? `${plate} · ${slot} · ${driver}` : `${plate} · ${slot}`,
      };
    });
  }, [pendingReservations]);

  const selectedSession = useMemo(
    () => activeSessions.find((session) => session.id === selectedSessionId) ?? null,
    [activeSessions, selectedSessionId],
  );
  const ownerPhone = selectedSession?.customerPhone?.replace(/\D/g, '').slice(0, 10) ?? '';

  async function handlePlateCheckoutLookup() {
    const plate = formatLicensePlateForApi(checkoutPlate);
    if (!plate) {
      showToast(
        t('Biển số phải đúng định dạng 51A-123.44', 'License plate must match format 51A-123.44'),
        'error',
      );
      return;
    }

    setIsLookingUpPlate(true);
    try {
      const session = await getActiveSessionByPlate(plate);
      if (!session) {
        showToast(t('Không có xe ACTIVE với biển này', 'No active session for this plate'), 'error');
        return;
      }
      await loadParkingSessions({ status: 'ACTIVE' }).catch((error) => {
        showToast(
          resolveApiErrorMessage(
            error,
            t('Không làm mới danh sách phiên', 'Could not refresh sessions'),
          ),
          'error',
        );
      });
      router.push(staffSessionDetailPath(session._id) as never);
    } catch (error) {
        showToast(
          resolveParkingSessionApiMessage(
            error,
            t,
            t('Tra cứu thất bại', 'Lookup failed'),
          ),
          'error',
        );
    } finally {
      setIsLookingUpPlate(false);
    }
  }

  async function handleMonthlyCheckout() {
    if (!selectedSessionId || !selectedSession) {
      showToast(t('Chọn phiên thẻ tháng', 'Select a monthly-card session'), 'error');
      return;
    }
    const phoneResult = validateStaffPhoneInput(ownerPhone, t);
    if (!phoneResult.ok) {
      showToast(
        t(
          'Phiên này chưa có SĐT chủ xe — không thể checkout thẻ tháng',
          'This session has no owner phone — cannot checkout monthly card',
        ),
        'error',
      );
      return;
    }

    setIsCheckingOut(true);
    try {
      await checkoutSession(selectedSessionId, phoneResult.phone);
      setSelectedSessionId(EMPTY_SELECTION);
      showToast(t('Checkout thành công', 'Checkout successful'), 'success');
      void reloadPickers();
    } catch (error) {
      showToast(
        resolveParkingSessionApiMessage(
          error,
          t,
          t('Checkout thất bại', 'Checkout failed'),
        ),
        'error',
      );
    } finally {
      setIsCheckingOut(false);
    }
  }

  async function handleDeleteReservation() {
    if (!selectedReservationId) {
      showToast(t('Chọn đặt chỗ PENDING', 'Select a PENDING reservation'), 'error');
      return;
    }

    setIsDeletingReservation(true);
    try {
      await deleteManagedReservation(selectedReservationId);
      setSelectedReservationId(EMPTY_SELECTION);
      showToast(t('Đã xóa đặt chỗ PENDING', 'PENDING reservation deleted'), 'success');
      void reloadPickers();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Không xóa được đặt chỗ', 'Cannot delete reservation'),
        'error',
      );
    } finally {
      setIsDeletingReservation(false);
    }
  }

  return (
    <StaffPageShell
      onRefresh={() => void reloadPickers()}
      refreshing={isLoadingSessions || isLoadingReservations}
      title={titles.checkout}>
      <StaffDarkCard accentBorder="primary" index={0} style={styles.cardPrimary}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, styles.iconBadgePrimary]}>
            <Ionicons color={DesignColors.primaryFocus} name="car-sport-outline" size={20} />
          </View>
          <ThemedText style={styles.cardTitle}>{t('Theo biển số', 'By plate')}</ThemedText>
        </View>

        <ThemedText style={styles.fieldLabel}>{t('Biển số xe', 'License plate')}</ThemedText>
        <StaffTextInput
          autoCapitalize="characters"
          editable={!isLookingUpPlate}
          onChangeText={setCheckoutPlate}
          placeholder="51A-123.44"
          style={styles.input}
          value={checkoutPlate}
        />
        <StaffActionButton
          disabled={isLookingUpPlate}
          label={t('Tra cứu & checkout', 'Lookup & checkout')}
          loading={isLookingUpPlate}
          onPress={() => void handlePlateCheckoutLookup()}
          style={styles.fullWidthButton}
        />
      </StaffDarkCard>

      <StaffDarkCard accentBorder="success" index={1} style={styles.cardMonthly}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, styles.iconBadgeMonthly]}>
            <Ionicons color={DesignColors.accentEmerald} name="card-outline" size={20} />
          </View>
          <ThemedText style={styles.cardTitle}>{t('Thẻ tháng', 'Monthly card')}</ThemedText>
        </View>

        <StaffFilterDropdown
          disabled={isLoadingSessions || isCheckingOut}
          emptyText={t('Không có phiên thẻ tháng ACTIVE', 'No ACTIVE monthly-card sessions')}
          label={t('Chọn phiên thẻ tháng', 'Select monthly-card session')}
          onChange={setSelectedSessionId}
          options={sessionOptions}
          placeholder={
            isLoadingSessions
              ? t('Đang tải…', 'Loading…')
              : t('Chạm để chọn xe thẻ tháng', 'Tap to pick monthly-card vehicle')
          }
          value={selectedSessionId}
        />

        {selectedSession ? (
          <View style={styles.ownerInfoBox}>
            <View style={styles.ownerInfoRow}>
              <Ionicons color={DesignColors.inkMuted} name="person-outline" size={16} />
              <ThemedText style={styles.ownerInfoValue}>
                {selectedSession.customerName?.trim()
                  || (selectedSession.isGuest
                    ? t('Khách vãng lai', 'Walk-in guest')
                    : t('Chưa có tên', 'Name unavailable'))}
              </ThemedText>
            </View>
            <View style={styles.ownerInfoRow}>
              <Ionicons color={DesignColors.inkMuted} name="call-outline" size={16} />
              <ThemedText style={styles.ownerInfoValue}>
                {ownerPhone || t('Chưa có SĐT', 'Phone unavailable')}
              </ThemedText>
            </View>
            <ThemedText style={styles.helperText}>
              {t('Vào lúc', 'Checked in')}: {selectedSession.timeLabel} · {selectedSession.slotLabel}
            </ThemedText>
          </View>
        ) : null}

        <StaffActionButton
          disabled={isCheckingOut || !selectedSessionId || ownerPhone.length !== 10}
          label={t('Xác nhận ra cổng', 'Confirm exit')}
          loading={isCheckingOut}
          onPress={() => void handleMonthlyCheckout()}
          style={styles.fullWidthButton}
        />
      </StaffDarkCard>

      <StaffDarkCard accentBorder="warning" index={2} style={styles.cardDanger}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, styles.iconBadgeDanger]}>
            <Ionicons color={DesignColors.accentAmber} name="trash-outline" size={20} />
          </View>
          <ThemedText style={styles.cardTitle}>{t('Xóa đặt chỗ', 'Delete reservation')}</ThemedText>
        </View>

        <StaffFilterDropdown
          disabled={isLoadingReservations || isDeletingReservation}
          emptyText={t('Không có đặt chỗ PENDING', 'No PENDING reservations')}
          label={t('Chọn đặt chỗ PENDING', 'Select PENDING reservation')}
          onChange={setSelectedReservationId}
          options={reservationOptions}
          placeholder={
            isLoadingReservations
              ? t('Đang tải…', 'Loading…')
              : t('Chạm để chọn biển / ô đặt', 'Tap to pick plate / spot')
          }
          value={selectedReservationId}
        />

        <StaffActionButton
          disabled={isDeletingReservation || !selectedReservationId}
          label={t('Xóa đặt chỗ PENDING', 'Delete PENDING reservation')}
          loading={isDeletingReservation}
          onPress={() => void handleDeleteReservation()}
          style={styles.fullWidthButton}
          variant="danger"
        />
      </StaffDarkCard>
    </StaffPageShell>
  );
}

function createStyles(
  DesignColors: ReturnType<typeof useStaffDesignColors>,
  isDark: boolean,
) {
  const elevatedCard = {
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : DesignColors.hairlineStrong,
    backgroundColor: isDark ? DesignColors.surface2 : DesignColors.surface1,
    shadowColor: isDark ? '#000' : DesignColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.35 : 0.1,
    shadowRadius: 16,
    elevation: 5,
    gap: Spacing.md,
    padding: Spacing.lg,
  } as const;

  return StyleSheet.create({
    cardPrimary: {
      ...elevatedCard,
      backgroundColor: isDark ? 'rgba(79,70,229,0.14)' : 'rgba(94,106,210,0.08)',
      borderColor: isDark ? 'rgba(129,140,248,0.35)' : 'rgba(94,106,210,0.28)',
    },
    cardMonthly: {
      ...elevatedCard,
      backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(5,150,105,0.07)',
      borderColor: isDark ? 'rgba(52,211,153,0.32)' : 'rgba(5,150,105,0.25)',
    },
    cardDanger: {
      ...elevatedCard,
      backgroundColor: isDark ? 'rgba(251,146,60,0.12)' : 'rgba(217,119,6,0.07)',
      borderColor: isDark ? 'rgba(251,146,60,0.35)' : 'rgba(217,119,6,0.28)',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: 2,
    },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    iconBadgePrimary: {
      backgroundColor: isDark ? 'rgba(99,102,241,0.22)' : 'rgba(94,106,210,0.14)',
      borderColor: isDark ? 'rgba(129,140,248,0.4)' : 'rgba(94,106,210,0.3)',
    },
    iconBadgeMonthly: {
      backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(5,150,105,0.12)',
      borderColor: isDark ? 'rgba(52,211,153,0.4)' : 'rgba(5,150,105,0.28)',
    },
    iconBadgeDanger: {
      backgroundColor: isDark ? 'rgba(251,146,60,0.2)' : 'rgba(217,119,6,0.12)',
      borderColor: isDark ? 'rgba(251,146,60,0.4)' : 'rgba(217,119,6,0.28)',
    },
    cardTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 17,
      flex: 1,
    },
    fieldLabel: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontWeight: '600',
      fontSize: 12,
      letterSpacing: 0.2,
      marginBottom: -4,
    },
    helperText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      marginTop: 2,
    },
    ownerInfoBox: {
      gap: Spacing.xs,
      padding: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(52,211,153,0.28)' : 'rgba(5,150,105,0.22)',
      backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(5,150,105,0.06)',
    },
    ownerInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    ownerInfoValue: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '600',
      flex: 1,
    },
    input: {
      backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : DesignColors.surface3,
      borderColor: isDark ? 'rgba(255,255,255,0.14)' : DesignColors.hairlineStrong,
    },
    fullWidthButton: {
      width: '100%',
      marginTop: 2,
    },
  });
}
