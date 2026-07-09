import { NotFoundError } from "../error/error.js";

class ParkingSessionService {
    #parkingSessionRepository;

    constructor({ parkingSessionRepository }) {
        this.#parkingSessionRepository = parkingSessionRepository;
    }

    getAllParkingSessions = async ({
        page = 1,
        limit = 10,
        status,
        vehicleId,
        parkingSlotId,
    }) => {
        return this.#parkingSessionRepository.findAll({
            page,
            limit,
            status,
            vehicleId,
            parkingSlotId,
        });
    };

    getParkingSessionById = async ({ parkingSessionId }) => {
        const parkingSession = await this.#parkingSessionRepository.findById({ parkingSessionId });
        if (!parkingSession) throw new NotFoundError("Parking session not found");
        return parkingSession;
    };

    createParkingSession = async (data) => {
        return this.#parkingSessionRepository.create(data);
    };

    updateParkingSession = async ({ parkingSessionId, updateData }) => {
        const parkingSession = await this.#parkingSessionRepository.update({
            parkingSessionId,
            updateData,
        });
        if (!parkingSession) throw new NotFoundError("Parking session not found");
        return parkingSession;
    };

    deleteParkingSession = async ({ parkingSessionId }) => {
        const parkingSession = await this.#parkingSessionRepository.delete({ parkingSessionId });
        if (!parkingSession) throw new NotFoundError("Parking session not found");
        return parkingSession;
    };
}

export default ParkingSessionService;
