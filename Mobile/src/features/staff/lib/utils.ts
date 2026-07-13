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

  const customerPhone =
    typeof session.checkInUserId === 'object'
      ? session.checkInUserId?.phone
      : session.phone ?? undefined;
  const customerName =
    typeof session.checkInUserId === 'object' ? session.checkInUserId?.fullName : undefined;

  const vehicleType =
    typeof session.vehicleId === 'object' &&
    session.vehicleId?.vehicleTypeId &&
    typeof session.vehicleId.vehicleTypeId === 'object'
      ? session.vehicleId.vehicleTypeId.type
      : undefined;

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
    vehicleType,
    sessionType: session.sessionType,
    customerPhone,
    customerName,
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
