import { NotFoundError } from "../error/error.js";

class FloorService {
    #floorRepository;

    constructor({ floorRepository }) {
        this.#floorRepository = floorRepository;
    }

    getAllFloors = async ({ page = 1, limit = 10, vehicleTypeId }) => {
        return this.#floorRepository.findAll({ page, limit, vehicleTypeId });
    };

    getFloorById = async ({ floorId }) => {
        const floor = await this.#floorRepository.findById({ floorId });
        if (!floor) throw new NotFoundError("Floor not found");
        return floor;
    };

    createFloor = async (data) => {
        return this.#floorRepository.create(data);
    };

    updateFloor = async ({ floorId, updateData }) => {
        const floor = await this.#floorRepository.update({ floorId, updateData });
        if (!floor) throw new NotFoundError("Floor not found");
        return floor;
    };

    deleteFloor = async ({ floorId }) => {
        const floor = await this.#floorRepository.delete({ floorId });
        if (!floor) throw new NotFoundError("Floor not found");
        return floor;
    };
}

export default FloorService;
