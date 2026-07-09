import ParkingSession from "../models/ParkingSession.js";
import { mapMongooseError } from "../utils/mongooseError.js";

class ParkingSessionRepository {
    #populateFields = [
        'vehicleId',
        {
            path: 'parkingSlotId',
            populate: {
                path: 'floorId',
                populate: { path: 'vehicleTypeId', select: '_id type' },
            },
        },
        { path: 'checkInUserId', select: '-password' },
        { path: 'checkOutUserId', select: '-password' },
        { path: 'checkInStaffId', select: '-password' },
        { path: 'checkOutStaffId', select: '-password' },
        { path: 'deleteStaffId', select: '-password' },
    ];

    findAll = async ({ page = 1, limit = 10, status, vehicleId, parkingSlotId }) => {
        const skip = (page - 1) * limit;
        const filter = {};
        if (status) filter.status = status;
        if (vehicleId) filter.vehicleId = vehicleId;
        if (parkingSlotId) filter.parkingSlotId = parkingSlotId;

        const [parkingSessions, total] = await Promise.all([
            ParkingSession.find(filter)
                .skip(skip)
                .limit(limit)
                .populate(this.#populateFields)
                .sort({ checkInTime: -1 })
                .lean(),
            ParkingSession.countDocuments(filter),
        ]);

        return {
            parkingSessions,
            pagination: {
                page,
                limit,
                totalCount: total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    findById = async ({ parkingSessionId }) => {
        const parkingSession = await ParkingSession.findById(parkingSessionId)
            .populate(this.#populateFields)
            .lean();
        return parkingSession ?? null;
    };

    create = async (data) => {
        try {
            const newParkingSession = await ParkingSession.create(data);
            return ParkingSession.findById(newParkingSession._id)
                .populate(this.#populateFields)
                .lean();
        } catch (error) {
            throw mapMongooseError(error);
        }
    };

    update = async ({ parkingSessionId, updateData }) => {
        try {
            const updatedParkingSession = await ParkingSession.findByIdAndUpdate(
                parkingSessionId,
                updateData,
                { new: true, runValidators: true },
            )
                .populate(this.#populateFields)
                .lean();
            return updatedParkingSession ?? null;
        } catch (error) {
            throw mapMongooseError(error);
        }
    };

    delete = async ({ parkingSessionId }) => {
        const deletedParkingSession = await ParkingSession.findByIdAndDelete(parkingSessionId)
            .populate(this.#populateFields)
            .lean();
        return deletedParkingSession ?? null;
    };
}

export default ParkingSessionRepository;
