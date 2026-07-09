class ParkingSlotController {
    #parkingSlotService;

    constructor({ parkingSlotService }) {
        this.#parkingSlotService = parkingSlotService;
    }

    getAllParkingSlots = async (req, res, next) => {
        try {
            const { page, limit, floorId, status } = req.query;
            const result = await this.#parkingSlotService.getAllParkingSlots({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                floorId,
                status,
            });
            res.status(200).json({
                status: 'success',
                data: { parkingSlots: result.parkingSlots, pagination: result.pagination },
                message: 'Parking slots fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    getParkingSlotById = async (req, res, next) => {
        try {
            const { parkingSlotId } = req.params;
            const parkingSlot = await this.#parkingSlotService.getParkingSlotById({ parkingSlotId });
            res.status(200).json({
                status: 'success',
                data: { parkingSlot },
                message: 'Parking slot fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    createParkingSlot = async (req, res, next) => {
        try {
            const parkingSlot = await this.#parkingSlotService.createParkingSlot(req.body);
            res.status(201).json({
                status: 'success',
                data: { parkingSlot },
                message: 'Parking slot created successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    updateParkingSlot = async (req, res, next) => {
        try {
            const { parkingSlotId } = req.params;
            const parkingSlot = await this.#parkingSlotService.updateParkingSlot({
                parkingSlotId,
                updateData: req.body,
            });
            res.status(200).json({
                status: 'success',
                data: { parkingSlot },
                message: 'Parking slot updated successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    deleteParkingSlot = async (req, res, next) => {
        try {
            const { parkingSlotId } = req.params;
            const parkingSlot = await this.#parkingSlotService.deleteParkingSlot({ parkingSlotId });
            res.status(200).json({
                status: 'success',
                data: { parkingSlot },
                message: 'Parking slot deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    };
}

export default ParkingSlotController;
