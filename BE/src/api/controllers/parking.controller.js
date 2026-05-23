class ParkingController {
    #parkingService;

    constructor({ parkingService }) {
        this.#parkingService = parkingService;
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
