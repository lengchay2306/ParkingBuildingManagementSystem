import { BadRequestError, NotFoundError } from "../error/error.js";

class ReservationService {
    #reservationRepository;

    constructor({ reservationRepository }) {
        this.#reservationRepository = reservationRepository;
    }

    createReservation = async ({
        driverId,
        vehicleId,
        parkingSlotId,
        expectedArrival,
    }) => {
        const vehicle = await this.#reservationRepository.findVehicleById({ vehicleId });
        if (!vehicle) {
            throw new NotFoundError("Vehicle not found");
        }

        if (vehicle.userId.toString() !== driverId.toString()) {
            throw new BadRequestError("This vehicle does not belong to you");
        }

        const parkingSlot = await this.#reservationRepository.findParkingSlotById({ parkingSlotId });
        if (!parkingSlot) {
            throw new NotFoundError("Parking slot not found");
        }

        if (parkingSlot.status !== "AVAILABLE") {
            throw new BadRequestError("Parking slot is not available");
        }

        const floor = parkingSlot.floorId;
        if (floor.vehicleTypeId._id.toString() !== vehicle.vehicleTypeId.toString()) {
            throw new BadRequestError("Vehicle type does not match this floor's vehicle type");
        }

        const existingReservation = await this.#reservationRepository.findActiveReservationBySlot({ parkingSlotId });
        if (existingReservation) {
            throw new BadRequestError("This slot already has an active reservation");
        }

        const reservedAt = new Date();
        const expiryAt = new Date(expectedArrival.getTime() + 1000 * 60 * 30);

        const reservation = await this.#reservationRepository.createReservation({
            driverId,
            vehicleId,
            parkingSlotId,
            expectedArrival,
            reservedAt,
            expiryAt,
            status: "PENDING",
        });

        return reservation;
    }

    getMyReservations = async ({ driverId, status }) => {
        const reservations = await this.#reservationRepository.findReservationsByDriverId({
            driverId,
            status,
        });

        return reservations;
    }
}

export default ReservationService;
