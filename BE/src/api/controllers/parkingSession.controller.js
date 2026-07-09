class ParkingSessionController {
    #parkingSessionService;

    constructor({ parkingSessionService }) {
        this.#parkingSessionService = parkingSessionService;
    }

    getAllParkingSessions = async (req, res, next) => {
        try {
            const { page, limit, status, vehicleId, parkingSlotId } = req.query;
            const result = await this.#parkingSessionService.getAllParkingSessions({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                status,
                vehicleId,
                parkingSlotId,
            });
            res.status(200).json({
                status: 'success',
                data: {
                    parkingSessions: result.parkingSessions,
                    pagination: result.pagination,
                },
                message: 'Parking sessions fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    getParkingSessionById = async (req, res, next) => {
        try {
            const { parkingSessionId } = req.params;
            const parkingSession = await this.#parkingSessionService.getParkingSessionById({
                parkingSessionId,
            });
            res.status(200).json({
                status: 'success',
                data: { parkingSession },
                message: 'Parking session fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    createParkingSession = async (req, res, next) => {
        try {
            const parkingSession = await this.#parkingSessionService.createParkingSession(req.body);
            res.status(201).json({
                status: 'success',
                data: { parkingSession },
                message: 'Parking session created successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    updateParkingSession = async (req, res, next) => {
        try {
            const { parkingSessionId } = req.params;
            const parkingSession = await this.#parkingSessionService.updateParkingSession({
                parkingSessionId,
                updateData: req.body,
            });
            res.status(200).json({
                status: 'success',
                data: { parkingSession },
                message: 'Parking session updated successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    deleteParkingSession = async (req, res, next) => {
        try {
            const { parkingSessionId } = req.params;
            const parkingSession = await this.#parkingSessionService.deleteParkingSession({
                parkingSessionId,
            });
            res.status(200).json({
                status: 'success',
                data: { parkingSession },
                message: 'Parking session deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    };
}

export default ParkingSessionController;
