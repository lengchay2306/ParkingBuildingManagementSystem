import { View, type TextStyle, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { DesignColorPalette } from "@/constants/design";
import type { Reservation } from "@/features/customer/api/reservations";

export function formatReservationDateTime(value: string | undefined) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function reservationStatusColor(status: string | undefined, DesignColors: DesignColorPalette) {
  const normalized = status?.toUpperCase();
  if (normalized === "PENDING") {
    return DesignColors.primary;
  }
  if (normalized === "CLAIMED") {
    return DesignColors.semanticSuccess;
  }
  if (normalized === "EXPIRED") {
    return DesignColors.inkMuted;
  }
  if (normalized === "CANCELLED") {
    return "#ef4444";
  }
  return DesignColors.inkSubtle;
}

function getReservationPlate(reservation: Reservation): string {
  if (typeof reservation.vehicleId === "object" && reservation.vehicleId?.licensePlate) {
    return reservation.vehicleId.licensePlate;
  }
  return "—";
}

function getReservationSlot(reservation: Reservation): string {
  if (typeof reservation.parkingSlotId === "object" && reservation.parkingSlotId?.slotNumber) {
    return reservation.parkingSlotId.slotNumber;
  }
  return "—";
}

function getReservationFloor(reservation: Reservation): string {
  const slot = reservation.parkingSlotId;
  if (typeof slot === "object" && slot?.floorId?.floorName) {
    return slot.floorId.floorName;
  }
  return "—";
}

export type ReservationCardStyles = {
  reservationCard: ViewStyle;
  reservationHeader: ViewStyle;
  plateBadge: ViewStyle;
  plateText: TextStyle;
  statusPill: ViewStyle;
  statusPillText: TextStyle;
  infoRow: ViewStyle;
  infoLabel: TextStyle;
  infoValue: TextStyle;
};

export function ReservationCard({
  reservation,
  t,
  styles,
  DesignColors,
}: {
  reservation: Reservation;
  t: (vi: string, en: string) => string;
  styles: ReservationCardStyles;
  DesignColors: DesignColorPalette;
}) {
  const statusColor = reservationStatusColor(reservation.status, DesignColors);

  return (
    <View style={styles.reservationCard}>
      <View style={styles.reservationHeader}>
        <View style={styles.plateBadge}>
          <ThemedText style={styles.plateText}>{getReservationPlate(reservation)}</ThemedText>
        </View>
        <View style={[styles.statusPill, { borderColor: statusColor }]}>
          <ThemedText style={[styles.statusPillText, { color: statusColor }]}>
            {reservation.status}
          </ThemedText>
        </View>
      </View>

      <View style={styles.infoRow}>
        <ThemedText style={styles.infoLabel}>{t("Chỗ đỗ", "Slot")}</ThemedText>
        <ThemedText style={styles.infoValue}>{getReservationSlot(reservation)}</ThemedText>
      </View>
      <View style={styles.infoRow}>
        <ThemedText style={styles.infoLabel}>{t("Tầng", "Floor")}</ThemedText>
        <ThemedText style={styles.infoValue}>{getReservationFloor(reservation)}</ThemedText>
      </View>
      <View style={styles.infoRow}>
        <ThemedText style={styles.infoLabel}>{t("Dự kiến đến", "Expected arrival")}</ThemedText>
        <ThemedText style={styles.infoValue}>
          {formatReservationDateTime(reservation.expectedArrival)}
        </ThemedText>
      </View>
      <View style={styles.infoRow}>
        <ThemedText style={styles.infoLabel}>{t("Hết hạn giữ chỗ", "Hold expires")}</ThemedText>
        <ThemedText style={styles.infoValue}>
          {formatReservationDateTime(reservation.expiryAt)}
        </ThemedText>
      </View>
    </View>
  );
}
