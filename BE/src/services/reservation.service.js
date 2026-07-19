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

        const now = Date.now();
        const arrivalMs = expectedArrival.getTime();
        const twoHoursFromNow = now + 2 * 60 * 60 * 1000;

        if (arrivalMs <= now) {
            throw new BadRequestError("expectedArrival must be a future date");
        }

        if (arrivalMs > twoHoursFromNow) {
            throw new BadRequestError("expectedArrival must be within 2 hours from now");
        }

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

    getMyReservations = async ({ driverId, status, page = 1, limit = 10 }) => {
        await this.#expireOverdueReservations();

        return this.#reservationRepository.findReservationsByDriverId({
            driverId,
            status,
            page,
            limit,
        });
    }

    getAllReservations = async ({ page, limit, status }) => {
        await this.#expireOverdueReservations();

        const filter = {};
        if (status) {
            filter.status = status;
        }

        return await this.#reservationRepository.getAllReservations({ filter, page, limit });
    }

    getAllReservationsByVehiclePlate = async ({ licensePlate, status, page = 1, limit = 10 }) => {
        await this.#expireOverdueReservations();

        const normalizedLicensePlate = licensePlate.trim().replace(/\s+/g, ' ').toUpperCase();

        const { vehicle, reservations, pagination } = await this.#reservationRepository.getAllReservationsByVehiclePlate({
            licensePlate: normalizedLicensePlate,
            status,
            page,
            limit,
        });

        if (!vehicle) {
            throw new NotFoundError("Vehicle not found");
        }

        return { vehicle, reservations, pagination };
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
        const expectedArrival = new Date(existingReservation.expectedArrival);

        if (expectedArrival <= fifteenMinFromNow) {
            throw new BadRequestError("Cannot cancel: reservation is within 15 minutes of expected arrival or past expected arrival");
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
        if (existingReservation.status == "PENDING") {
        throw new BadRequestError("PENDING CANNOT BE DELETED");
        }
        const deletedReservation = await this.#reservationRepository.deleteReservation({ reservationId });
        return deletedReservation;
    }

    expireOverdueReservations = async () => {
        return this.#reservationRepository.expireOverdueReservations();
    }
}

export default ReservationService;
