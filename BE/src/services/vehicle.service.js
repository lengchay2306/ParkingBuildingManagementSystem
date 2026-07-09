import { BadRequestError, NotFoundError, ConflictError } from "../error/error.js";

class VehicleService {
    #vehicleRepository;

    constructor({
        vehicleRepository
    }) {
        this.#vehicleRepository = vehicleRepository;
    }

    adminCreateVehicleForUser = async ({
        userId,
        licensePlate,
        vehicleTypeId,
        monthlyCardId,
        status = "ACTIVE",
    }) => {
        const checkVehicleType = await this.#vehicleRepository.getVehicleTypeById({
            vehicleTypeId,
        });
        if (!checkVehicleType) {
            throw new NotFoundError("Vehicle type not found");
        }

        const existingVehicle = await this.#vehicleRepository.getVehicleByLicensePlate({
            licensePlate,
        });
        if (existingVehicle) {
            throw new ConflictError("Vehicle already exists");
        }

        const newVehicle = await this.#vehicleRepository.createVehicle({
            userId,
            licensePlate: licensePlate.toUpperCase(),
            vehicleTypeId,
            monthlyCardId,
            status,
        });
        if (!newVehicle) {
            throw new Error("Failed to create vehicle");
        }

        return this.#vehicleRepository.getVehicleById({ vehicleId: newVehicle._id });
    }

    createVehicle = async ({
        userId,
        licensePlate,
        vehicleTypeId
    }) => {
        const checkVehicleType = await this.#vehicleRepository.getVehicleTypeById({
            vehicleTypeId
        })
        if (!checkVehicleType) {
            throw new NotFoundError("Vehicle type not found");
        }

        const existingVehicle = await this.#vehicleRepository.getVehicleByLicensePlate({
            licensePlate
        })
        if (existingVehicle) {
            throw new ConflictError("Vehicle already exists");
        }
        const newVehicle = await this.#vehicleRepository.createVehicle({
            userId,
            licensePlate: licensePlate.toUpperCase(),
            vehicleTypeId
        })
        if (!newVehicle) {
            throw new Error("Failed to create vehicle");
        }
        return newVehicle;
    }

    getVehicleByLicensePlate = async ({ licensePlate }) => {
        const vehicle = await this.#vehicleRepository.getVehicleByLicensePlate({
            licensePlate
        })
        if (!vehicle) {
            throw new NotFoundError("Vehicle not found");
        }
        return vehicle;
    }

    getAllVehicleType = async () => {
        const vehicleTypes = await this.#vehicleRepository.getAllVehicleType()
        if (!vehicleTypes) {
            throw new NotFoundError("Vehicle types not found");
        }
        return vehicleTypes;
    }

    getVehicleByUserId = async ({ userId }) => {
        const user = await this.#vehicleRepository.getUserWithVehicles({
            userId,
        });
        if (!user) {
            throw new NotFoundError("User not found");
        }
        return user;
    }

    updateVehicle = async ({ userId, vehicleId, updateData }) => {
        const existingVehicle = await this.#vehicleRepository.getVehicleById({ vehicleId });
        if (!existingVehicle) {
            throw new NotFoundError("Vehicle not found");
        }

        if (existingVehicle.userId.toString() !== userId) {
            throw new BadRequestError("You can only update your own vehicle");
        }

        if (updateData.vehicleTypeId) {
            const checkType = await this.#vehicleRepository.getVehicleTypeById({
                vehicleTypeId: updateData.vehicleTypeId
            });
            if (!checkType) {
                throw new NotFoundError("Vehicle type not found");
            }
        }

        if (updateData.licensePlate) {
            const duplicate = await this.#vehicleRepository.getVehicleByLicensePlate({
                licensePlate: updateData.licensePlate
            });
            if (duplicate && duplicate._id.toString() !== vehicleId) {
                throw new ConflictError("License plate already exists");
            }
            updateData.licensePlate = updateData.licensePlate.toUpperCase();
        }

        const updatedVehicle = await this.#vehicleRepository.updateVehicle({
            vehicleId,
            updateData
        });
        return updatedVehicle;
    }

    adminUpdateVehicle = async ({ vehicleId, updateData }) => {
        const existingVehicle = await this.#vehicleRepository.getVehicleById({ vehicleId });
        if (!existingVehicle) {
            throw new NotFoundError("Vehicle not found");
        }

        if (updateData.vehicleTypeId) {
            const checkType = await this.#vehicleRepository.getVehicleTypeById({
                vehicleTypeId: updateData.vehicleTypeId
            });
            if (!checkType) {
                throw new NotFoundError("Vehicle type not found");
            }
        }

        if (updateData.licensePlate) {
            const duplicate = await this.#vehicleRepository.getVehicleByLicensePlate({
                licensePlate: updateData.licensePlate
            });
            if (duplicate && duplicate._id.toString() !== vehicleId) {
                throw new ConflictError("License plate already exists");
            }
            updateData.licensePlate = updateData.licensePlate.toUpperCase();
        }

        const updatedVehicle = await this.#vehicleRepository.updateVehicle({
            vehicleId,
            updateData
        });
        return updatedVehicle;
    }

    adminDeleteVehicle = async ({ vehicleId, userId }) => {
        const existingVehicle = await this.#vehicleRepository.getVehicleById({ vehicleId });
        if (!existingVehicle) {
            throw new NotFoundError("Vehicle not found");
        }

        if (userId && existingVehicle.userId.toString() !== userId.toString()) {
            throw new BadRequestError("Vehicle does not belong to this user");
        }

        const deletedVehicle = await this.#vehicleRepository.deleteVehicleById({ vehicleId });
        if (!deletedVehicle) {
            throw new NotFoundError("Vehicle not found");
        }

        return deletedVehicle;
    }

    softDeleteVehicle = async ({ userId, vehicleId }) => {
        const existingVehicle = await this.#vehicleRepository.getVehicleById({ vehicleId });
        if (!existingVehicle) {
            throw new NotFoundError("Vehicle not found");
        }

        if (existingVehicle.userId.toString() !== userId) {
            throw new BadRequestError("You can only delete your own vehicle");
        }

        if (existingVehicle.status === "INACTIVE") {
            throw new BadRequestError("Vehicle is already deleted");
        }

        const deletedVehicle = await this.#vehicleRepository.softDeleteVehicle({ vehicleId });
        if (!deletedVehicle) {
            throw new Error("Failed to soft delete vehicle");
        }
        return deletedVehicle;
    }
}
export default VehicleService;