class FloorController {
    #floorService;

    constructor({ floorService }) {
        this.#floorService = floorService;
    }

    getAllFloors = async (req, res, next) => {
        try {
            const { page, limit, vehicleTypeId } = req.query;
            const result = await this.#floorService.getAllFloors({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                vehicleTypeId,
            });
            res.status(200).json({
                status: 'success',
                data: { floors: result.floors, pagination: result.pagination },
                message: 'Floors fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    getFloorById = async (req, res, next) => {
        try {
            const { floorId } = req.params;
            const floor = await this.#floorService.getFloorById({ floorId });
            res.status(200).json({
                status: 'success',
                data: { floor },
                message: 'Floor fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    createFloor = async (req, res, next) => {
        try {
            const floor = await this.#floorService.createFloor(req.body);
            res.status(201).json({
                status: 'success',
                data: { floor },
                message: 'Floor created successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    updateFloor = async (req, res, next) => {
        try {
            const { floorId } = req.params;
            const floor = await this.#floorService.updateFloor({ floorId, updateData: req.body });
            res.status(200).json({
                status: 'success',
                data: { floor },
                message: 'Floor updated successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    deleteFloor = async (req, res, next) => {
        try {
            const { floorId } = req.params;
            const floor = await this.#floorService.deleteFloor({ floorId });
            res.status(200).json({
                status: 'success',
                data: { floor },
                message: 'Floor deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    };
}

export default FloorController;
