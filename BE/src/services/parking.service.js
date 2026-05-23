import { BadRequestError, NotFoundError } from "../error/error.js";

class ParkingService {
    #parkingRepository;

    constructor({ parkingRepository }) {
        this.#parkingRepository = parkingRepository;
    }

    getParkingSlots = async ({ vehicleType, floorId, status }) => {
        let vehicleTypeId = null;

        if (vehicleType) {
            const matched = await this.#parkingRepository.findVehicleTypeByName({ vehicleType });
            if (!matched) {
                throw new NotFoundError(`Vehicle type '${vehicleType}' not found`);
            }
            vehicleTypeId = matched._id;
        }

        if (status) {
            const validStatuses = ['AVAILABLE', 'UNAVAILABLE', 'CURRENTLY-IN-USED'];
            if (!validStatuses.includes(status.toUpperCase())) {
                throw new BadRequestError(
                    `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`
                );
            }
        }

        const floors = await this.#parkingRepository.getFloorsWithSlots({
            floorId,
            vehicleTypeId,
            slotStatus: status ? status.toUpperCase() : null,
        });

        if (floorId && floors.length === 0) {
            throw new NotFoundError(`Floor not found`);
        }

        return floors;
    }
}

export default ParkingService;
