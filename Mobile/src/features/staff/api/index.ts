export {
  collectAvailableSlots,
  createParkingSession,
  getParkingSlots,
  type CreateParkingSessionPayload,
  type ParkingFloor,
  type ParkingSession,
  type ParkingSlot,
  type ParkingSlotFilters,
  type ParkingSlotStatus,
} from './parking';

export {
  getVehicleByLicensePlate,
  getVehicleTypes,
  resolveVehicleTypeLabel,
  type StaffVehicle,
  type VehicleType,
} from './vehicles';

export { deleteManagedReservation, type Reservation } from './reservations';
