class ParkingController {
    #parkingService;

    constructor({ parkingService }) {
        this.#parkingService = parkingService;
    }

    //PARKING SESSION----
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
                // parkingSlotId,
            } = req.body

            const { userId } = req.user

            const newParkingSession = await this.#parkingService.createNewParkingSession({
                phone,
                licensePlate,
                staffId: userId,
                // parkingSlotId,
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

    createNewParkingSessionForGuest = async (req, res, next) => {
        try {
            const { 
                phone, 
                licensePlate,
                parkingSlotId,
                vehicleTypeId,
            } = req.body

            const { userId } = req.user

            const newParkingSession = await this.#parkingService.createNewParkingSessionForGuest({
                phone,
                licensePlate,
                staffId: userId,
                parkingSlotId,
                vehicleTypeId,
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

    deleteErrorParkingSession = async (req, res, next) => {
        try {
            const { userId } = req.body

            const { parkingSessionId } = req.params

            const updatedParkingSession = await this.#parkingService.deleteErrorParkingSession({
                staffId: userId,
                parkingSessionId: parkingSessionId
            })

            res.status(200).json({
                status: 'success',
                data: {
                    updatedParkingSession,
                }
            })
        } catch (error) {
            next(error)
        }
    }

    getAllParkingSessions = async (req, res, next) => {
        try {
            const {
                page,
                limit,
                status,
                date,
            } = req.query

            const parkingSessions = await this.#parkingService.getAllParkingSessions({
                page,
                limit,
                status,
                date,
            })

            res.status(200).json({
                status: 'success',
                data: {
                    parkingSessions,
                }
            })
        } catch (error) {
            next(error)
        }
    }

    getUserParkingSessions = async (req, res, next) => {
        try {
            const { vehicleId } = req.params

            const parkingSession = await this.#parkingService.getUserParkingSessions({
                vehicleId,
            })

            res.status(200).json({
                status: 'success',
                data: {
                    parkingSession,
                }
            })
        } catch (error) {
            next(error)
        }
    }

    //----------

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
