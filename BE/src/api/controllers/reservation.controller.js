class ReservationController {
    #reservationService;

    constructor({ reservationService }) {
        this.#reservationService = reservationService;
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
}

export default ReservationController;
