import type { ParkingFloor, ParkingSession } from '@/features/staff/api';

export type StaffCheckInRecord = {
  id: string;
  plate: string;
  slotLabel: string;
  status: string;
  timeLabel: string;
};

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
