import type { ParkingSlotFilters, ParkingSlotApiStatus, ParkingVehicleType } from '@/features/customer/api/parking';

export type SpotStatusFilter = 'ALL' | ParkingSlotApiStatus;
export type VehicleTypeFilter = 'ALL' | string;
export type FloorFilter = 'ALL' | string;

export function buildParkingSlotApiFilters({
  status,
  floorId,
  vehicleType,
}: {
  status: SpotStatusFilter;
  floorId: FloorFilter;
  vehicleType: VehicleTypeFilter;
}): ParkingSlotFilters {
  const filters: ParkingSlotFilters = {};

  if (status !== 'ALL') {
    filters.status = status;
  }
  if (floorId !== 'ALL') {
    filters.floorId = floorId;
  }
  if (vehicleType !== 'ALL') {
    filters.vehicleType = vehicleType as ParkingVehicleType;
  }

  return filters;
}
