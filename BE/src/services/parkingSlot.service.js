import { NotFoundError } from "../error/error.js";

class ParkingSlotService {
    #parkingSlotRepository;

    constructor({ parkingSlotRepository }) {
        this.#parkingSlotRepository = parkingSlotRepository;
    }

    getAllParkingSlots = async ({ page = 1, limit = 10, floorId, status }) => {
        return this.#parkingSlotRepository.findAll({ page, limit, floorId, status });
    };

    getParkingSlotById = async ({ parkingSlotId }) => {
        const parkingSlot = await this.#parkingSlotRepository.findById({ parkingSlotId });
        if (!parkingSlot) throw new NotFoundError("Parking slot not found");
        return parkingSlot;
    };

    createParkingSlot = async (data) => {
        return this.#parkingSlotRepository.create(data);
    };

    updateParkingSlot = async ({ parkingSlotId, updateData }) => {
        const parkingSlot = await this.#parkingSlotRepository.update({ parkingSlotId, updateData });
        if (!parkingSlot) throw new NotFoundError("Parking slot not found");
        return parkingSlot;
    };

    deleteParkingSlot = async ({ parkingSlotId }) => {
        const parkingSlot = await this.#parkingSlotRepository.delete({ parkingSlotId });
        if (!parkingSlot) throw new NotFoundError("Parking slot not found");
        return parkingSlot;
    };
}

export default ParkingSlotService;
