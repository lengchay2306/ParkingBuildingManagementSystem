import Vehicle from "../models/Vehicle.js";
import VehicleType from "../models/VehicleType.js";

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
        const existingVehicle = await Vehicle.findOne({ licensePlate }).lean();
        return existingVehicle;
    }

    getAllVehicleType = async () => {
        const vehicleTypes = await VehicleType.find().lean();
        return vehicleTypes;
    }
    getVehicleByUserId = async ({ userId }) => {
        const vehicles = await Vehicle.find({ userId })
            .populate("vehicleTypeId")
            .lean();
        return vehicles;
    }
}