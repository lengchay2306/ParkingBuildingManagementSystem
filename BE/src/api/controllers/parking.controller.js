class ParkingController {
    #parkingService;

    constructor({ parkingService }) {
        this.#parkingService = parkingService;
    }

    checkoutParkingSession = async (req, res, next) => {
        try {
            const { parkingSessionId } = req.params

            const { phone } = req.body

            const { userId } = req.user

            const updatedParkingSession = await this.#parkingService.checkoutParkingSession({
                parkingSessionId: parkingSessionId,
                userPhone: phone,
                checkOutStaffId: userId,
            })

            res.status(201).json({
                status: 'success',
                data: {
                    parkingSession: updatedParkingSession,
                }
            })
        } catch (error) {
            next(error)
        }
    }

    createNewParkingSession = async (req, res, next) => {
        try {
            const { 
                phone, 
                licensePlate,
                parkingSlotId,
            } = req.body

            const { userId } = req.user

            const newParkingSession = await this.#parkingService.createNewParkingSession({
                phone,
                licensePlate,
                staffId: userId,
                parkingSlotId,
            })

            res.status(201).json({
                status: 'success',
                data: {
                    parkingSession: newParkingSession
                }
            });
        } catch (error) {
            next(error)
        }
    }

    getParkingSlots = async (req, res, next) => {
        try {
            const { vehicleType, floorId, status } = req.query;

            const floors = await this.#parkingService.getParkingSlots({
                vehicleType,
                floorId,
                status,
            });

            res.status(200).json({
                status: 'success',
                data: {
                    floors,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

export default ParkingController;
