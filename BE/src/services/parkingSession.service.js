import { BadRequestError, NotFoundError } from "../error/error.js";

class ParkingSessionService {
    #parkingSessionRepository;
    #parkingSlotRepository;

    constructor({ parkingSessionRepository, parkingSlotRepository }) {
        this.#parkingSessionRepository = parkingSessionRepository;
        this.#parkingSlotRepository = parkingSlotRepository;
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

    /**
     * When parkingSlotId changes on an ACTIVE session:
     * - old slot CURRENTLY-IN-USED → AVAILABLE
     * - new slot must be AVAILABLE → CURRENTLY-IN-USED
     */
    #reassignParkingSlot = async ({
        existingSession,
        newParkingSlotId,
    }) => {
        const oldParkingSlotId = existingSession.parkingSlotId?._id
            ?? existingSession.parkingSlotId;

        if (String(oldParkingSlotId) === String(newParkingSlotId)) {
            throw new BadRequestError("New parking slot is the same as the current slot");
        }

        if (existingSession.status !== "ACTIVE") {
            throw new BadRequestError("Only ACTIVE parking sessions can change parking slot");
        }

        const newParkingSlot = await this.#parkingSlotRepository.findById({
            parkingSlotId: newParkingSlotId,
        });

        if (!newParkingSlot) {
            throw new NotFoundError("New parking slot not found");
        }

        if (newParkingSlot.status !== "AVAILABLE") {
            throw new BadRequestError("New parking slot is not available");
        }

        const oldFloorVehicleTypeId = existingSession.parkingSlotId?.floorId?.vehicleTypeId?._id
            ?? existingSession.parkingSlotId?.floorId?.vehicleTypeId;
        const newFloorVehicleTypeId = newParkingSlot.floorId?.vehicleTypeId?._id
            ?? newParkingSlot.floorId?.vehicleTypeId;

        if (
            oldFloorVehicleTypeId
            && newFloorVehicleTypeId
            && String(oldFloorVehicleTypeId) !== String(newFloorVehicleTypeId)
        ) {
            throw new BadRequestError("New parking slot vehicle type does not match the session floor type");
        }

        const updatedSession = await this.#parkingSessionRepository.update({
            parkingSessionId: existingSession._id,
            updateData: { parkingSlotId: newParkingSlotId },
        });

        if (!updatedSession) {
            throw new BadRequestError("Cannot update parking session slot");
        }

        await this.#parkingSlotRepository.update({
            parkingSlotId: oldParkingSlotId,
            updateData: { status: "AVAILABLE" },
        });

        await this.#parkingSlotRepository.update({
            parkingSlotId: newParkingSlotId,
            updateData: { status: "CURRENTLY-IN-USED" },
        });

        return this.#parkingSessionRepository.findById({
            parkingSessionId: existingSession._id,
        });
    };

    updateParkingSession = async ({ parkingSessionId, updateData }) => {
        const existingSession = await this.#parkingSessionRepository.findById({ parkingSessionId });
        if (!existingSession) {
            throw new NotFoundError("Parking session not found");
        }

        const nextSlotId = updateData.parkingSlotId;
        const currentSlotId = existingSession.parkingSlotId?._id
            ?? existingSession.parkingSlotId;

        if (nextSlotId && String(nextSlotId) !== String(currentSlotId)) {
            const { parkingSlotId: _ignored, ...restUpdateData } = updateData;

            let parkingSession = await this.#reassignParkingSlot({
                existingSession,
                newParkingSlotId: nextSlotId,
            });

            if (Object.keys(restUpdateData).length > 0) {
                parkingSession = await this.#parkingSessionRepository.update({
                    parkingSessionId,
                    updateData: restUpdateData,
                });
                if (!parkingSession) {
                    throw new NotFoundError("Parking session not found");
                }
            }

            return parkingSession;
        }

        const parkingSession = await this.#parkingSessionRepository.update({
            parkingSessionId,
            updateData,
        });
        if (!parkingSession) throw new NotFoundError("Parking session not found");
        return parkingSession;
    };

    /**
     * Staff corrects the parked slot when the session recorded the wrong slot.
     */
    correctParkingSessionSlot = async ({ parkingSessionId, parkingSlotId }) => {
        const existingSession = await this.#parkingSessionRepository.findById({ parkingSessionId });
        if (!existingSession) {
            throw new NotFoundError("Parking session not found");
        }

        return this.#reassignParkingSlot({
            existingSession,
            newParkingSlotId: parkingSlotId,
        });
    };

    deleteParkingSession = async ({ parkingSessionId }) => {
        const parkingSession = await this.#parkingSessionRepository.delete({ parkingSessionId });
        if (!parkingSession) throw new NotFoundError("Parking session not found");
        return parkingSession;
    };
}

export default ParkingSessionService;
