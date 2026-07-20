import type { ParkingFloor } from '@/features/staff/api';
import type { StaffFilterOption } from '@/features/staff/components/premium/staff-filter-pills';
import type { SpotStatusFilter, VehicleTypeFilter } from '@/features/staff/lib/parking-slot-filters';
import {
  resolveParkingVehicleTypeLabel,
  sortSlotsByNumber,
} from '@/lib/parking-floor-config';

export type StaffSpotCounts = {
  total: number;
  available: number;
  inUsed: number;
  reserved: number;
  unavailable: number;
};

const VEHICLE_TYPE_DISPLAY_ORDER: readonly string[] = [
  'BIKE',
  'MOTORBIKE',
  'EBIKE',
  'ECAR',
  'HATCHBACK',
  'SEDAN',
  'CUV',
  'SUV',
  'MPV',
  'PICKUP',
];

function vehicleTypeSortIndex(type: string): number {
  const index = VEHICLE_TYPE_DISPLAY_ORDER.indexOf(type.toUpperCase());
  return index === -1 ? 999 : index;
}

export function buildVehicleTypeFilterOptions(
  floors: ParkingFloor[],
  t: (vi: string, en: string) => string,
): StaffFilterOption<VehicleTypeFilter>[] {
  const byId = new Map<string, string>();

  for (const floor of floors) {
    const vehicleType = floor.vehicleType;
    if (vehicleType?._id && vehicleType.type) {
      byId.set(vehicleType._id, vehicleType.type);
    }
  }

  const sorted = [...byId.entries()].sort(([_, leftType], [__, rightType]) =>
    vehicleTypeSortIndex(leftType) - vehicleTypeSortIndex(rightType),
  );

  return [
    { id: 'ALL', label: t('Mọi loại', 'All types') },
    ...sorted.map(([id, type]) => ({
      id,
      label: resolveParkingVehicleTypeLabel(type, t),
    })),
  ];
}

export function countSpotStatuses(floors: ParkingFloor[]): StaffSpotCounts {
  let available = 0;
  let inUsed = 0;
  let reserved = 0;
  let unavailable = 0;

  for (const floor of floors) {
    for (const slot of floor.slots) {
      if (slot.status === 'AVAILABLE') {
        available += 1;
      } else if (slot.status === 'CURRENTLY-IN-USED') {
        inUsed += 1;
      } else if (slot.status === 'RESERVED') {
        reserved += 1;
      } else if (slot.status === 'UNAVAILABLE') {
        unavailable += 1;
      }
    }
  }

  return {
    total: available + inUsed + reserved + unavailable,
    available,
    inUsed,
    reserved,
    unavailable,
  };
}

function slotMatchesStatus(status: SpotStatusFilter, slot: ParkingFloor['slots'][number]): boolean {
  if (status === 'ALL') {
    return true;
  }
  return slot.status === status;
}

function slotMatchesSearch(searchQuery: string, slot: ParkingFloor['slots'][number]): boolean {
  const query = searchQuery.trim().toUpperCase();
  if (!query) {
    return true;
  }
  return slot.slotNumber.toUpperCase().includes(query);
}

export function filterParkingFloors(
  floors: ParkingFloor[],
  {
    status,
    vehicleType,
    searchQuery,
  }: {
    status: SpotStatusFilter;
    vehicleType: VehicleTypeFilter;
    searchQuery: string;
  },
): ParkingFloor[] {
  return floors
    .filter((floor) => vehicleType === 'ALL' || floor.vehicleType?._id === vehicleType)
    .map((floor) => ({
      ...floor,
      slots: sortSlotsByNumber(
        floor.slots.filter(
          (slot) => slotMatchesStatus(status, slot) && slotMatchesSearch(searchQuery, slot),
        ),
      ),
    }))
    .filter((floor) => floor.slots.length > 0);
}

export function flattenFloorSlots(floors: ParkingFloor[]) {
  return floors.flatMap((floor) =>
    floor.slots.map((slot) => ({
      slot,
      floorId: floor._id,
      floorName: floor.floorName,
    })),
  );
}
