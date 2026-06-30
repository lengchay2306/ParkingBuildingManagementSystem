import { BadRequestError, NotFoundError } from "../error/error.js";

class ReservationService {
    #reservationRepository;

    constructor({ reservationRepository }) {
        this.#reservationRepository = reservationRepository;
    }

    #expireOverdueReservations = async () => {
        return this.#reservationRepository.expireOverdueReservations();
    }

    createReservation = async ({
        driverId,
        vehicleId,
        parkingSlotId,
        expectedArrival,
    }) => {
        await this.#expireOverdueReservations();

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
        const expiryAt = new Date(expectedArrival.getTime() + 1000 * 60 * 15);

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
        await this.#expireOverdueReservations();

        const reservations = await this.#reservationRepository.findReservationsByDriverId({
            driverId,
            status,
        });

        return reservations;
    }

    getAllReservations = async ({ page, limit, status }) => {
        await this.#expireOverdueReservations();

        const filter = {};
        if (status) {
            filter.status = status;
        }

        return await this.#reservationRepository.getAllReservations({ filter, page, limit });
    }

    cancelReservation = async ({ driverId, reservationId }) => {
        const existingReservation = await this.#reservationRepository.findReservationById({ reservationId });
        if (!existingReservation) {
            throw new NotFoundError("Reservation not found");
        }

        if (existingReservation.driverId.toString() !== driverId.toString()) {
            throw new BadRequestError("This reservation does not belong to you");
        }

        if (existingReservation.status !== "PENDING") {
            throw new BadRequestError("Only PENDING reservations can be cancelled");
        }

        const fifteenMinFromNow = new Date(Date.now() + 1000 * 60 * 15);
        if (new Date(existingReservation.expectedArrival) < fifteenMinFromNow) {
            throw new BadRequestError("Cannot cancel: reservation is within 15 minutes of expected arrival");
        }

        const cancelledReservation = await this.#reservationRepository.cancelReservation({
            reservationId,
            parkingSlotId: existingReservation.parkingSlotId,
        });
        return cancelledReservation;
    }

    deleteReservation = async ({ reservationId }) => {
        const existingReservation = await this.#reservationRepository.findReservationById({ reservationId });
        if (!existingReservation) {
            throw new NotFoundError("Reservation not found");
        }
        if (existingReservation.status !== "PENDING") {
            throw new BadRequestError("Only PENDING reservations can be deleted");
        }
        const deletedReservation = await this.#reservationRepository.deleteReservation({ reservationId });
        return deletedReservation;
    }

    expireOverdueReservations = async () => {
        return this.#reservationRepository.expireOverdueReservations();
    }
}

export default ReservationService;
