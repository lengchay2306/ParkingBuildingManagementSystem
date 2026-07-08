import {
  getSessionLicensePlate,
  type ParkingSession,
} from "@/services/parking.service";
import {
  getReservationVehiclePlate,
  type Reservation,
} from "@/services/reservation.service";

export type LicensePlateBlockOptions = {
  /** Reservation PENDING được phép khi staff check-in từ đặt chỗ đó */
  allowPendingReservationId?: string;
};

export const normalizeLicensePlate = (licensePlate: string) =>
  licensePlate.trim().replace(/\s+/g, " ").toUpperCase();

export const getLicensePlateBlockReason = (
  licensePlate: string,
  reservations: Reservation[],
  sessions: ParkingSession[],
  options: LicensePlateBlockOptions = {},
): string | null => {
  const normalized = normalizeLicensePlate(licensePlate);
  if (!normalized) {
    return null;
  }

  const hasActiveSession = sessions.some((session) => {
    if (session.status !== "ACTIVE") {
      return false;
    }
    const sessionPlate = getSessionLicensePlate(session);
    return sessionPlate ? normalizeLicensePlate(sessionPlate) === normalized : false;
  });

  if (hasActiveSession) {
    return "Biển số này đang có xe gửi trong bãi, không thể tạo thêm reservation hoặc session.";
  }

  for (const reservation of reservations) {
    if (reservation.status !== "PENDING" && reservation.status !== "CLAIMED") {
      continue;
    }

    const reservationPlate = getReservationVehiclePlate(reservation);
    if (!reservationPlate || normalizeLicensePlate(reservationPlate) !== normalized) {
      continue;
    }

    if (reservation.status === "CLAIMED") {
      return "Biển số này đã check-in qua đặt chỗ, không thể tạo thêm reservation hoặc session.";
    }

    if (
      options.allowPendingReservationId &&
      reservation._id === options.allowPendingReservationId
    ) {
      continue;
    }

    return "Biển số này đã có đặt chỗ đang hoạt động (PENDING).";
  }

  return null;
};

export const getVehicleReserveBlockReason = (
  vehicleId: string,
  licensePlate: string | null | undefined,
  reservations: Reservation[],
  sessions: ParkingSession[],
) => {
  if (licensePlate) {
    return getLicensePlateBlockReason(licensePlate, reservations, sessions);
  }

  for (const session of sessions) {
    const sessionVehicleId =
      typeof session.vehicleId === "object" ? session.vehicleId?._id : session.vehicleId;
    if (session.status === "ACTIVE" && sessionVehicleId === vehicleId) {
      return "Xe này đang gửi trong bãi, không thể đặt chỗ thêm.";
    }
  }

  for (const reservation of reservations) {
    const reservationVehicleId =
      typeof reservation.vehicleId === "object"
        ? reservation.vehicleId._id
        : reservation.vehicleId;
    if (reservationVehicleId !== vehicleId) {
      continue;
    }
    if (reservation.status === "PENDING" || reservation.status === "CLAIMED") {
      return "Xe này đã có đặt chỗ đang hoạt động (PENDING hoặc đã check-in).";
    }
  }

  return null;
};
