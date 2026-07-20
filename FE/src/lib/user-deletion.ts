import type { ParkingSession } from "@/services/parking.service";
import type { Reservation } from "@/services/reservation.service";
import type { UserProfile } from "@/services/user.service";

export type UserDeletionBlockers = {
  canDelete: boolean;
  hasActiveSession: boolean;
  hasActiveReservation: boolean;
  message: string | null;
};

export const buildUserDeletionBlockMessage = ({
  hasActiveSession,
  hasActiveReservation,
}: Pick<UserDeletionBlockers, "hasActiveSession" | "hasActiveReservation">) => {
  const parts: string[] = [];

  if (hasActiveSession) {
    parts.push("đang có xe trong bãi");
  }
  if (hasActiveReservation) {
    parts.push("đang có đặt chỗ");
  }

  if (parts.length === 0) {
    return null;
  }

  return `Không thể xóa người dùng ${parts.join(" và ")}. Vui lòng khóa tài khoản (LOCKED) thay vì xóa.`;
};

const getEntityId = (value: string | { _id: string } | null | undefined) => {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return value._id;
};

export const getUserDeletionBlockers = (
  user: Pick<UserProfile, "_id" | "vehicles">,
  activeSessions: ParkingSession[],
  pendingReservations: Reservation[],
): UserDeletionBlockers => {
  const vehicleIds = new Set((user.vehicles ?? []).map((vehicle) => vehicle._id));

  const hasActiveSession = activeSessions.some((session) => {
    if (session.status !== "ACTIVE") {
      return false;
    }

    const checkInUserId = getEntityId(session.checkInUserId ?? null);
    if (checkInUserId === user._id) {
      return true;
    }

    const vehicleId = getEntityId(session.vehicleId ?? null);
    return vehicleId ? vehicleIds.has(vehicleId) : false;
  });

  const hasActiveReservation = pendingReservations.some((reservation) => {
    if (reservation.status !== "PENDING") {
      return false;
    }
    if (reservation.expiryAt && new Date(reservation.expiryAt).getTime() <= Date.now()) {
      return false;
    }

    const driverId = getEntityId(reservation.driverId ?? null);
    return driverId === user._id;
  });

  const canDelete = !hasActiveSession && !hasActiveReservation;

  return {
    canDelete,
    hasActiveSession,
    hasActiveReservation,
    message: canDelete
      ? null
      : buildUserDeletionBlockMessage({ hasActiveSession, hasActiveReservation }),
  };
};
