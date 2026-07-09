import ParkingSlot from "../models/ParkingSlot.js";
import { mapMongooseError } from "../utils/mongooseError.js";

class ParkingSlotRepository {
    #populateFloor = {
        path: 'floorId',
        populate: {
            path: 'vehicleTypeId',
            select: '_id type',
        },
    };

    findAll = async ({ page = 1, limit = 10, floorId, status }) => {
        const skip = (page - 1) * limit;
        const filter = {};
        if (floorId) filter.floorId = floorId;
        if (status) filter.status = status;

        const [parkingSlots, total] = await Promise.all([
            ParkingSlot.find(filter)
                .skip(skip)
                .limit(limit)
                .populate(this.#populateFloor)
                .sort({ floorId: 1, slotNumber: 1 })
                .lean(),
            ParkingSlot.countDocuments(filter),
        ]);

        return {
            parkingSlots,
            pagination: {
                page,
                limit,
                totalCount: total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    findById = async ({ parkingSlotId }) => {
        const parkingSlot = await ParkingSlot.findById(parkingSlotId)
            .populate(this.#populateFloor)
            .lean();
        return parkingSlot ?? null;
    };

    create = async (data) => {
        try {
            const newParkingSlot = await ParkingSlot.create(data);
            return ParkingSlot.findById(newParkingSlot._id)
                .populate(this.#populateFloor)
                .lean();
        } catch (error) {
            throw mapMongooseError(error);
        }
    };

    update = async ({ parkingSlotId, updateData }) => {
        try {
            const updatedParkingSlot = await ParkingSlot.findByIdAndUpdate(
                parkingSlotId,
                updateData,
                { new: true, runValidators: true },
            )
                .populate(this.#populateFloor)
                .lean();
            return updatedParkingSlot ?? null;
        } catch (error) {
            throw mapMongooseError(error);
        }
    };

    delete = async ({ parkingSlotId }) => {
        const deletedParkingSlot = await ParkingSlot.findByIdAndDelete(parkingSlotId)
            .populate(this.#populateFloor)
            .lean();
        return deletedParkingSlot ?? null;
    };
}

export default ParkingSlotRepository;
