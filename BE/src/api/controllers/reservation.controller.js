class ReservationController {
    #reservationService;
    #slotRecommendationService;

    constructor({ reservationService, slotRecommendationService }) {
        this.#reservationService = reservationService;
        this.#slotRecommendationService = slotRecommendationService;
    }

    createReservation = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { vehicleId, parkingSlotId, expectedArrival } = req.body;

            const reservation = await this.#reservationService.createReservation({
                driverId: userId,
                vehicleId,
                parkingSlotId,
                expectedArrival: new Date(expectedArrival),
            });

            res.status(201).json({
                status: 'success',
                data: {
                    reservation,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    recommendSlots = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { vehicleId, expectedArrival, limit } = req.body;

            const result = await this.#slotRecommendationService.recommendSlots({
                driverId: userId,
                vehicleId,
                expectedArrival: new Date(expectedArrival),
                limit: limit ?? 3,
            });

            res.status(200).json({
                status: 'success',
                data: result,
                message: 'Slot recommendations fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    getMyReservations = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { status, page, limit } = req.query;
            const result = await this.#reservationService.getMyReservations({
                driverId: userId,
                status,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
            });

            res.status(200).json({
                status: 'success',
                data: {
                    reservations: result.reservations,
                    pagination: result.pagination,
                },
                message: 'Reservations fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    getAllReservations = async (req, res, next) => {
        try {
            const { page, limit, status } = req.query;
            const result = await this.#reservationService.getAllReservations({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                status,
            });

            res.status(200).json({
                status: 'success',
                data: {
                    reservations: result.reservations,
                    pagination: result.pagination,
                },
                message: 'Reservations fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    getAllReservationsByVehiclePlate = async (req, res, next) => {
        try {
            const { licensePlate } = req.params;
            const { status, page, limit } = req.query;

            const result = await this.#reservationService.getAllReservationsByVehiclePlate({
                licensePlate,
                status,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
            });

            res.status(200).json({
                status: 'success',
                data: {
                    vehicle: result.vehicle,
                    reservations: result.reservations,
                    pagination: result.pagination,
                },
                message: 'Reservations fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    cancelReservation = async (req, res, next) => {
        try {
            const { reservationId } = req.params;
            const { userId } = req.user;
            const cancelledReservation = await this.#reservationService.cancelReservation({ driverId: userId, reservationId });
            res.status(200).json({
                status: 'success',
                data: {
                    cancelledReservation,
                    message: 'Reservation cancelled successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }

    deleteReservation = async (req, res, next) => {
        try {
            const { reservationId } = req.params;
            const deletedReservation = await this.#reservationService.deleteReservation({ reservationId });
            res.status(200).json({
                status: 'success',
                data: {
                    deletedReservation,
                },
                message: 'Reservation deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}

export default ReservationController;