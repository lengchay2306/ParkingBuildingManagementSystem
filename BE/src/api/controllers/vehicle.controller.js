class VehicleController {
    #vehicleService;
    constructor({
        vehicleService
    }) {
        this.#vehicleService = vehicleService;
    }

    createVehicle = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { licensePlate, vehicleTypeId } = req.body;
            const newVehicle = await this.#vehicleService.createVehicle({
                userId,
                licensePlate,
                vehicleTypeId
            });

            return res.status(201).json({
                status: 'success',
                data: {
                    vehicle: newVehicle,
                },
                message: 'Vehicle created successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    getAllVehicleType = async (req, res, next) => {
        try {
            const vehicleTypes = await this.#vehicleService.getAllVehicleType();

            return res.status(200).json({
                status: 'success',
                data: {
                    vehicleTypes,
                },
                message: 'Vehicle types fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    getVehicleByLicensePlate = async (req, res, next) => {
        try {
            const { licensePlate } = req.params;
            const vehicle = await this.#vehicleService.getVehicleByLicensePlate({
                licensePlate
            });

            return res.status(200).json({
                status: 'success',
                data: {
                    vehicle,
                },
                message: 'Vehicle fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    getVehicleByUserId = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const vehicles = await this.#vehicleService.getVehicleByUserId({
                userId
            });
            return res.status(200).json({
                status: 'success',
                data: {
                    vehicles,
                },
                message: 'Vehicles fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    updateVehicle = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { vehicleId } = req.params;
            const updateData = req.body;
            const updatedVehicle = await this.#vehicleService.updateVehicle({
                userId,
                vehicleId,
                updateData
            });
            return res.status(200).json({
                status: 'success',
                data: {
                    vehicle: updatedVehicle,
                },
                message: 'Vehicle updated successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    softDeleteVehicle = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { vehicleId } = req.params;
            const softDeletedVehicle = await this.#vehicleService.softDeleteVehicle({
                userId,
                vehicleId
            });
            return res.status(200).json({
                status: 'success',
                data: {
                    vehicle: softDeletedVehicle,
                },
                message: 'Vehicle soft deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    };
}
export default VehicleController;
