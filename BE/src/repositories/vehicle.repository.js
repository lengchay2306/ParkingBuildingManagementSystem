import Vehicle from "../models/Vehicle.js";
import VehicleType from "../models/VehicleType.js";
import User from "../models/User.js";

class VehicleRepository {
    createVehicle = async ({
        userId,
        licensePlate,
        vehicleTypeId
    }) => {
        const newVehicle = await Vehicle.create({
            userId,
            licensePlate,
            vehicleTypeId
        })
        return newVehicle.toObject();
    }

    getVehicleTypeById = async ({ vehicleTypeId }) => {
        const existingVehicleType = await VehicleType.findById(vehicleTypeId).lean();
        return existingVehicleType;
    }

    getVehicleByLicensePlate = async ({ licensePlate }) => {
        const existingVehicle = await Vehicle.findOne({ licensePlate })
                                            .populate(['vehicleTypeId', "monthlyCardId"])
                                            .lean();

        if (!existingVehicle) {
            return null;
        }
        
        return existingVehicle;
    }

    getAllVehicleType = async () => {
        const vehicleTypes = await VehicleType.find().lean();
        return vehicleTypes;
    }
    getUserWithVehicles = async ({ userId }) => {
        const user = await User.findById(userId)
            .select("-password -__v")
            .populate("roleId", "roleName")
            .lean();

        if (!user) {
            return null;
        }

        const vehicles = await Vehicle.find({ userId })
            .select("-userId -__v")
            .populate("vehicleTypeId", "_id type")
            .populate("monthlyCardId", "_id cardCode startDate endDate status")
            .lean();

        return {
            ...user,
            vehicles,
        };
    }

    getVehicleById = async ({ vehicleId }) => {
        const vehicle = await Vehicle.findById(vehicleId)
                                    .populate("vehicleTypeId")
                                    .populate("monthlyCardId")
                                    .lean();
        return vehicle;
    }

    updateVehicle = async ({ vehicleId, updateData }) => {
        const updatedVehicle = await Vehicle.findByIdAndUpdate(vehicleId, updateData, { new: true })
                                            .populate("vehicleTypeId")
                                            .populate("monthlyCardId")
                                            .lean();
        if (!updatedVehicle) {
            return null;
        }
        return updatedVehicle;
    }

    softDeleteVehicle = async ({ vehicleId }) => {
        const deletedVehicle = await Vehicle.findByIdAndUpdate(vehicleId, { status: "INACTIVE" }, { new: true })
                                            .populate("vehicleTypeId")
                                            .populate("monthlyCardId")
                                            .lean();
        if (!deletedVehicle) {
            return null;
        }
        return deletedVehicle;
    }
}

export default VehicleRepository;