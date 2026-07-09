import Floor from "../models/Floor.js";
import { mapMongooseError } from "../utils/mongooseError.js";

class FloorRepository {
    #populateVehicleType = {
        path: 'vehicleTypeId',
        select: '_id type',
    };

    findAll = async ({ page = 1, limit = 10, vehicleTypeId }) => {
        const skip = (page - 1) * limit;
        const filter = {};
        if (vehicleTypeId) filter.vehicleTypeId = vehicleTypeId;

        const [floors, total] = await Promise.all([
            Floor.find(filter)
                .skip(skip)
                .limit(limit)
                .populate(this.#populateVehicleType)
                .sort({ floorName: 1 })
                .lean(),
            Floor.countDocuments(filter),
        ]);

        return {
            floors,
            pagination: {
                page,
                limit,
                totalCount: total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    findById = async ({ floorId }) => {
        const floor = await Floor.findById(floorId)
            .populate(this.#populateVehicleType)
            .lean();
        return floor ?? null;
    };

    create = async (data) => {
        try {
            const newFloor = await Floor.create(data);
            return Floor.findById(newFloor._id)
                .populate(this.#populateVehicleType)
                .lean();
        } catch (error) {
            throw mapMongooseError(error);
        }
    };

    update = async ({ floorId, updateData }) => {
        try {
            const updatedFloor = await Floor.findByIdAndUpdate(
                floorId,
                updateData,
                { new: true, runValidators: true },
            )
                .populate(this.#populateVehicleType)
                .lean();
            return updatedFloor ?? null;
        } catch (error) {
            throw mapMongooseError(error);
        }
    };

    delete = async ({ floorId }) => {
        const deletedFloor = await Floor.findByIdAndDelete(floorId)
            .populate(this.#populateVehicleType)
            .lean();
        return deletedFloor ?? null;
    };
}

export default FloorRepository;
