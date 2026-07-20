import type { ParkingFloor, ParkingSession } from "@/services/parking.service";
import {
  getParkingSessionSlotId,
  getReservationVehicleId,
} from "@/services/parking.service";
import type { Reservation } from "@/services/reservation.service";
import { getReservationSlotId } from "@/services/reservation.service";
import type { UserProfile } from "@/services/user.service";

export const reservedByYouBadgeStyle =
  "border-status-yours/45 bg-status-yours/15 text-status-yours";

export type ReservationDisplayStatus = Reservation["status"] | "CHECKED IN" | "CHECKED OUT";

export function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function reservationMatchesDateFilter(reservation: Reservation, dateKey: string) {
  const source = reservation.expectedArrival ?? reservation.reservedAt;
  if (!source) {
    return false;
  }
  return getLocalDateInputValue(new Date(source)) === dateKey;
}

/** Newest expected arrival / reserved time first. */
export function sortReservationsByRecent(reservations: Reservation[]) {
  return [...reservations].sort(
    (left, right) => getReservationSortTime(right) - getReservationSortTime(left),
  );
}

function getReservationSortTime(reservation: Reservation) {
  const source = reservation.expectedArrival ?? reservation.reservedAt ?? reservation.expiryAt;
  if (!source) {
    return 0;
  }
  const time = new Date(source).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function formatReservationHistoryDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function formatDriverDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Không có";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getReservationVehicleLabel(reservation: Reservation) {
  if (reservation.vehicleId && typeof reservation.vehicleId === "object") {
    return reservation.vehicleId.licensePlate ?? reservation.vehicleId._id;
  }
  return reservation.vehicleId ?? "—";
}

export function getReservationSlotLabel(reservation: Reservation) {
  if (typeof reservation.parkingSlotId === "object") {
    const slotNumber = reservation.parkingSlotId.slotNumber ?? reservation.parkingSlotId._id;
    const floorName = reservation.parkingSlotId.floorId?.floorName;
    if (slotNumber && floorName) {
      return `${slotNumber} · ${floorName}`;
    }
    return slotNumber ?? "—";
  }
  return reservation.parkingSlotId ?? "—";
}

export function findSessionForReservation(
  reservation: Reservation,
  sessionsByVehicleId: Map<string, ParkingSession>,
) {
  const vehicleId = getReservationVehicleId(reservation);
  if (!vehicleId) {
    return null;
  }

  const session = sessionsByVehicleId.get(vehicleId);
  if (!session) {
    return null;
  }

  const reservationSlotId = getReservationSlotId(reservation);
  const sessionSlotId = getParkingSessionSlotId(session);
  if (reservationSlotId && sessionSlotId && reservationSlotId !== sessionSlotId) {
    return null;
  }

  return session;
}

export function getReservationDisplayStatus(
  reservation: Reservation,
  _parkingSession: ParkingSession | null,
): ReservationDisplayStatus {
  // Show DB reservation status (PENDING / CLAIMED / EXPIRED / CANCELLED).
  return (reservation.status?.toUpperCase() ?? "PENDING") as Reservation["status"];
}

export function getReservationStatusBadge(status: ReservationDisplayStatus) {
  switch (status) {
    case "PENDING":
      return reservedByYouBadgeStyle;
    case "CLAIMED":
    case "CHECKED IN":
      return "border-status-empty/45 bg-status-empty/15 text-status-empty";
    case "CHECKED OUT":
      return "border-primary/45 bg-primary/15 text-primary";
    case "CANCELLED":
      return "border-border bg-muted text-muted-foreground";
    case "EXPIRED":
      return "border-status-full/45 bg-status-full/15 text-status-full";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function getReservationStatusLabel(status: ReservationDisplayStatus) {
  return String(status ?? "—").trim().toUpperCase() || "—";
}

function getSlotStatusFromFloors(slotId: string, parkingFloors: ParkingFloor[]) {
  for (const floor of parkingFloors) {
    const slot = floor.slots?.find((item) => item._id === slotId);
    if (slot) {
      return slot.status;
    }
  }
  return null;
}

export function enrichReservationForDetail(
  reservation: Reservation,
  parkingFloors: ParkingFloor[],
  profile: UserProfile | null,
  parkingSession: ParkingSession | null = null,
): Reservation {
  const slotId = getReservationSlotId(reservation);
  const liveSlotStatus = slotId ? getSlotStatusFromFloors(slotId, parkingFloors) : null;
  const displayStatus = getReservationDisplayStatus(reservation, parkingSession);

  let nextReservation: Reservation = {
    ...reservation,
    status: displayStatus as Reservation["status"],
  };

  if (profile && typeof nextReservation.driverId === "string") {
    nextReservation = {
      ...nextReservation,
      driverId: {
        _id: profile._id,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
      },
    };
  }

  if (liveSlotStatus && typeof nextReservation.parkingSlotId === "object") {
    return {
      ...nextReservation,
      parkingSlotId: {
        ...nextReservation.parkingSlotId,
        status: liveSlotStatus,
      },
    };
  }

  return nextReservation;
}
