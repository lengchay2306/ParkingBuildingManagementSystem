import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import type { CustomerParkingSession } from '@/features/customer/api/parking';
import type { Reservation } from '@/features/customer/api/reservations';
import {
  findPendingReservationForVehicle,
  getVehicleReserveBlockReasonLocalized,
} from '@/features/customer/lib/parking-validation';
import type { UserVehicle } from '@/lib/auth-api';
import { formatDbStatus } from '@/lib/db-status';
import { CUSTOMER_ROUTES } from '@/roles';

function formatShortDateTime(value?: string) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveSlotLabel(reservation: Reservation) {
  const slot = reservation.parkingSlotId;
  if (!slot || typeof slot === 'string') {
    return null;
  }
  const floor =
    typeof slot.floorId === 'object' && slot.floorId
      ? slot.floorId.floorName
      : null;
  const number = slot.slotNumber;
  if (floor && number) {
    return `${floor} · ${number}`;
  }
  return number ?? null;
}

function resolveSessionSlot(session: CustomerParkingSession | null) {
  if (!session || typeof session.parkingSlotId !== 'object') {
    return null;
  }
  const floor = session.parkingSlotId.floorId?.floorName;
  const slot = session.parkingSlotId.slotNumber;
  if (floor && slot) {
    return `${floor} · ${slot}`;
  }
  return slot ?? null;
}

function hasMonthlyCard(vehicle: UserVehicle) {
  return Boolean(vehicle.monthlyCardId);
}

type Props = {
  vehicles: UserVehicle[];
  reservations: Reservation[];
  sessionsByVehicleId: Record<string, CustomerParkingSession | null>;
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

/** FE "Xe & Đặt chỗ" — vehicle cards with live session / pending hold + reserve CTA. */
export function CustomerHomeVehiclesSection({
  vehicles,
  reservations,
  sessionsByVehicleId,
  t,
  DesignColors,
}: Props) {
  const router = useRouter();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerText}>
          <ThemedText style={styles.eyebrow}>{t('Xe & Đặt chỗ', 'Vehicles & reserve')}</ThemedText>
          <ThemedText style={styles.title}>{t('Xe của tôi', 'My vehicles')}</ThemedText>
        </View>
        <ScalePressable
          onPress={() => router.push(CUSTOMER_ROUTES.profile as never)}
          style={styles.manageLink}
          scaleTo={0.95}
        >
          <Ionicons name="add-circle-outline" size={16} color={DesignColors.primary} />
          <ThemedText style={styles.manageLinkText}>{t('Quản lý', 'Manage')}</ThemedText>
        </ScalePressable>
      </View>

      {vehicles.length === 0 ? (
        <ScalePressable
          onPress={() => router.push(CUSTOMER_ROUTES.profile as never)}
          style={styles.emptyCard}
          scaleTo={0.98}
        >
          <Ionicons name="car-outline" size={28} color={DesignColors.inkSubtle} />
          <ThemedText style={styles.emptyTitle}>
            {t('Chưa có xe đăng ký', 'No vehicles registered')}
          </ThemedText>
          <ThemedText style={styles.emptyHint}>
            {t('Thêm biển số trong Hồ sơ để đặt chỗ.', 'Add a plate in Profile to reserve.')}
          </ThemedText>
        </ScalePressable>
      ) : (
        <View style={styles.list}>
          {vehicles.map((vehicle) => {
            const session = sessionsByVehicleId[vehicle._id] ?? null;
            const isInLot =
              session?.status?.toUpperCase() === 'ACTIVE' && !session?.checkOutTime;
            const pending = findPendingReservationForVehicle(vehicle._id, reservations);
            const blockReason = getVehicleReserveBlockReasonLocalized(
              vehicle._id,
              reservations,
              t,
              { hasActiveSession: isInLot },
            );
            const canReserve = !blockReason;
            const typeLabel =
              typeof vehicle.vehicleTypeId === 'object' && vehicle.vehicleTypeId?.type
                ? vehicle.vehicleTypeId.type
                : '—';
            const monthly = hasMonthlyCard(vehicle);

            return (
              <View key={vehicle._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: isInLot
                          ? `${DesignColors.semanticSuccess}18`
                          : `${DesignColors.primary}14`,
                        borderColor: isInLot
                          ? `${DesignColors.semanticSuccess}44`
                          : `${DesignColors.primary}33`,
                      },
                    ]}
                  >
                    <Ionicons
                      name="car-sport-outline"
                      size={22}
                      color={isInLot ? DesignColors.semanticSuccess : DesignColors.primary}
                    />
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.plateRow}>
                      <ThemedText style={styles.plate}>{vehicle.licensePlate}</ThemedText>
                      <View style={styles.typePill}>
                        <ThemedText style={styles.typePillText}>{typeLabel}</ThemedText>
                      </View>
                    </View>

                    <View style={styles.badgeRow}>
                      {monthly ? (
                        <View style={[styles.badge, styles.badgeMonthly]}>
                          <Ionicons
                            name="card-outline"
                            size={11}
                            color={DesignColors.accentBlue}
                          />
                          <ThemedText style={[styles.badgeText, { color: DesignColors.accentBlue }]}>
                            {t('Thẻ tháng', 'Monthly')}
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={[styles.badge, styles.badgeOk]}>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={11}
                            color={DesignColors.semanticSuccess}
                          />
                          <ThemedText
                            style={[styles.badgeText, { color: DesignColors.semanticSuccess }]}
                          >
                            {t('Đã đăng ký', 'Registered')}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {(pending || isInLot) && (
                  <View style={styles.statusRow}>
                    {pending ? (
                      <View style={[styles.statusChip, styles.statusReserved]}>
                        <Ionicons
                          name="location"
                          size={12}
                          color={DesignColors.semanticWarning}
                        />
                        <ThemedText
                          style={[styles.statusChipText, { color: DesignColors.semanticWarning }]}
                          numberOfLines={1}
                        >
                          {formatDbStatus(pending.status, 'PENDING')}{' '}
                          {resolveSlotLabel(pending) ?? '—'}
                          {pending.expectedArrival
                            ? ` · ${formatShortDateTime(pending.expectedArrival)}`
                            : ''}
                        </ThemedText>
                      </View>
                    ) : null}
                    {isInLot ? (
                      <View style={[styles.statusChip, styles.statusParked]}>
                        <Ionicons
                          name="navigate-circle"
                          size={12}
                          color={DesignColors.semanticSuccess}
                        />
                        <ThemedText
                          style={[styles.statusChipText, { color: DesignColors.semanticSuccess }]}
                          numberOfLines={1}
                        >
                          {formatDbStatus(session?.status, 'ACTIVE')}
                          {resolveSessionSlot(session) ? ` · ${resolveSessionSlot(session)}` : ''}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                )}

                <View style={styles.actions}>
                  {canReserve ? (
                    <ScalePressable
                      onPress={() => router.push(CUSTOMER_ROUTES.reservations as never)}
                      style={styles.primaryAction}
                      scaleTo={0.96}
                    >
                      <Ionicons name="location-outline" size={14} color={DesignColors.onPrimary} />
                      <ThemedText style={styles.primaryActionText}>
                        {t('Đặt chỗ', 'Reserve')}
                      </ThemedText>
                    </ScalePressable>
                  ) : (
                    <View style={styles.blockedHint}>
                      <ThemedText style={styles.blockedText} numberOfLines={2}>
                        {blockReason}
                      </ThemedText>
                    </View>
                  )}

                  <ScalePressable
                    onPress={() => router.push(CUSTOMER_ROUTES.profile as never)}
                    style={styles.ghostAction}
                    scaleTo={0.96}
                  >
                    <Ionicons name="create-outline" size={16} color={DesignColors.inkMuted} />
                  </ScalePressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    section: {
      gap: Spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    eyebrow: {
      ...Typography.eyebrow,
      color: DesignColors.primary,
      textTransform: 'uppercase',
    },
    title: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    manageLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
    },
    manageLinkText: {
      ...Typography.bodySm,
      color: DesignColors.primary,
      fontWeight: '600',
    },
    emptyCard: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      borderStyle: 'dashed',
      backgroundColor: DesignColors.surface1,
      padding: Spacing.lg,
      alignItems: 'center',
      gap: Spacing.xs,
    },
    emptyTitle: {
      ...Typography.body,
      color: DesignColors.ink,
      fontWeight: '600',
      marginTop: Spacing.xs,
    },
    emptyHint: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textAlign: 'center',
    },
    list: {
      gap: Spacing.sm,
    },
    card: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: `${DesignColors.primary}28`,
      backgroundColor: DesignColors.surface1,
      padding: Spacing.md,
      gap: Spacing.sm,
      overflow: 'hidden',
    },
    cardTop: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignItems: 'flex-start',
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: Radius.lg,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardMain: {
      flex: 1,
      gap: 6,
      minWidth: 0,
    },
    plateRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
    },
    plate: {
      ...Typography.mono,
      fontSize: 16,
      lineHeight: 22,
      color: DesignColors.ink,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    typePill: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: `${DesignColors.primary}40`,
      backgroundColor: `${DesignColors.primary}14`,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    typePillText: {
      ...Typography.caption,
      color: DesignColors.primary,
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeMonthly: {
      borderColor: `${DesignColors.accentBlue}55`,
      backgroundColor: `${DesignColors.accentBlue}14`,
    },
    badgeOk: {
      borderColor: `${DesignColors.semanticSuccess}55`,
      backgroundColor: `${DesignColors.semanticSuccess}12`,
    },
    badgeText: {
      ...Typography.caption,
      fontWeight: '600',
      fontSize: 10,
    },
    statusRow: {
      gap: 6,
    },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: Radius.md,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    statusReserved: {
      borderColor: `${DesignColors.semanticWarning}55`,
      backgroundColor: `${DesignColors.semanticWarning}12`,
    },
    statusParked: {
      borderColor: `${DesignColors.semanticSuccess}55`,
      backgroundColor: `${DesignColors.semanticSuccess}12`,
    },
    statusChipText: {
      ...Typography.caption,
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      flex: 1,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
      paddingTop: Spacing.sm,
      marginTop: 2,
    },
    primaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: Radius.md,
      backgroundColor: DesignColors.primary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
    },
    primaryActionText: {
      ...Typography.caption,
      color: DesignColors.onPrimary,
      fontWeight: '700',
    },
    blockedHint: {
      flex: 1,
      paddingRight: Spacing.xs,
    },
    blockedText: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    ghostAction: {
      marginLeft: 'auto',
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
