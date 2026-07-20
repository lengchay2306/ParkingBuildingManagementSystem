import type { ParkingFloor, ParkingSession } from '@/features/staff/api';

export type StaffCheckInRecord = {
  id: string;
  plate: string;
  slotLabel: string;
  slotId?: string;
  status: string;
  timeLabel: string;
  checkInTime?: string;
  checkOutTime?: string;
  vehicleType?: string;
  sessionType?: string;
  customerPhone?: string;
  customerName?: string;
  isGuest?: boolean;
};

export function formatDurationFrom(iso?: string): string {
  if (!iso) {
    return '—';
  }
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) {
    return '—';
  }
  const minutes = Math.max(0, Math.floor((Date.now() - start) / 60000));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function formatTimeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function resolveSlotLabel(
  parkingSlotId: ParkingSession['parkingSlotId'],
  floors: ParkingFloor[],
): string {
  const slotId = typeof parkingSlotId === 'string' ? parkingSlotId : parkingSlotId?._id;
  if (!slotId) {
    return '—';
  }
  for (const floor of floors) {
    const slot = floor.slots.find((item) => item._id === slotId);
    if (slot) {
      return `${floor.floorName} · ${slot.slotNumber}`;
    }
  }
  if (typeof parkingSlotId === 'object' && parkingSlotId.slotNumber) {
    return parkingSlotId.slotNumber;
  }
  return slotId.slice(-6);
}

function resolvePopulatedUser(
  value: ParkingSession['checkInUserId'],
): { fullName?: string; phone?: string } | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value;
}

function resolveVehicleTypeFromSession(
  session: ParkingSession,
  floors: ParkingFloor[],
): string | undefined {
  if (typeof session.vehicleId === 'object' && session.vehicleId?.vehicleTypeId) {
    const vehicleTypeId = session.vehicleId.vehicleTypeId;
    if (typeof vehicleTypeId === 'object' && vehicleTypeId.type) {
      return vehicleTypeId.type;
    }
  }

  const slotId =
    typeof session.parkingSlotId === 'object'
      ? session.parkingSlotId._id
      : session.parkingSlotId;

  if (slotId) {
    for (const floor of floors) {
      if (floor.slots.some((slot) => slot._id === slotId)) {
        return floor.vehicleType?.type
          ?? (typeof floor.vehicleTypeId === 'object' ? floor.vehicleTypeId.type : undefined);
      }
    }
  }

  if (typeof session.parkingSlotId === 'object') {
    const floor = session.parkingSlotId.floorId;
    if (typeof floor === 'object' && floor) {
      if (typeof floor.vehicleTypeId === 'object' && floor.vehicleTypeId?.type) {
        return floor.vehicleTypeId.type;
      }
    }
    if (session.parkingSlotId.slotNumber && floors.length === 0) {
      return undefined;
    }
  }

  return undefined;
}

export function computeSlotStats(floors: ParkingFloor[]) {
  return floors.reduce(
    (acc, floor) => {
      const stats = floor.slotStats;
      if (stats) {
        acc.available += stats.available;
        acc.inUsed += stats.inUsed;
        acc.unavailable += stats.unavailable;
        acc.total += stats.total;
      }
      return acc;
    },
    { available: 0, inUsed: 0, unavailable: 0, total: 0 },
  );
}

export function todayDateParam(): string {
  return new Date().toISOString().slice(0, 10);
}

export function mapParkingSessionToRecord(
  session: ParkingSession,
  floors: ParkingFloor[] = [],
): StaffCheckInRecord {
  const plate =
    typeof session.vehicleId === 'object' && session.vehicleId?.licensePlate
      ? session.vehicleId.licensePlate
      : session.licensePlate ?? '—';

  const checkInUser = resolvePopulatedUser(session.checkInUserId);
  const isGuest = Boolean(session.isGuest) || (!session.vehicleId && !checkInUser);

  const customerPhone =
    checkInUser?.phone?.trim() || session.phone?.trim() || undefined;
  const customerName = checkInUser?.fullName?.trim() || undefined;

  return {
    id: session._id,
    plate,
    slotLabel: resolveSlotLabel(session.parkingSlotId, floors),
    slotId:
      typeof session.parkingSlotId === 'object'
        ? session.parkingSlotId._id
        : session.parkingSlotId,
    status: session.status,
    timeLabel: formatTimeLabel(session.checkInTime),
    checkInTime: session.checkInTime,
    checkOutTime: session.checkOutTime,
    vehicleType: resolveVehicleTypeFromSession(session, floors),
    sessionType: session.sessionType,
    customerPhone,
    customerName,
    isGuest,
  };
}

/** ACTIVE sessions keyed by parking slot id — from GET /parking/parking-sessions. */
export function indexActiveSessionsBySlotId(
  sessions: StaffCheckInRecord[],
): Record<string, StaffCheckInRecord> {
  const bySlot: Record<string, StaffCheckInRecord> = {};
  for (const session of sessions) {
    if (session.status.toUpperCase() !== 'ACTIVE' || !session.slotId) {
      continue;
    }
    bySlot[session.slotId] = session;
  }
  return bySlot;
}

/** Display helpers for session detail cards. */
export function resolveSessionCustomerLabel(
  session: Pick<StaffCheckInRecord, 'customerName' | 'isGuest'>,
  t: (vi: string, en: string) => string,
): string {
  if (session.customerName?.trim()) {
    return session.customerName.trim();
  }
  if (session.isGuest) {
    return t('Khách vãng lai', 'Walk-in guest');
  }
  return t('Chưa rõ', 'Unknown');
}

export function resolveSessionVehicleTypeLabel(
  session: Pick<StaffCheckInRecord, 'vehicleType'>,
  t: (vi: string, en: string) => string,
): string {
  return session.vehicleType?.trim() || t('Chưa rõ', 'Unknown');
}
