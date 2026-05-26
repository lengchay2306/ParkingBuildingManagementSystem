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

    getMyReservations = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { status } = req.query;
            const reservations = await this.#reservationService.getMyReservations({
                driverId: userId,
                status,
            });

            res.status(200).json({
                status: 'success',
                data: { 
                    reservations: reservations,
                    message: 'Reservations fetched successfully',   
                }
            })
        } catch (error) {
            next(error);
        }
    }
}

export default ReservationController;