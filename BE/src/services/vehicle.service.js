import { BadRequestError, NotFoundError, ConflictError } from "../error/error.js";

class VehicleService {
    #vehicleRepository;

    constructor({
        vehicleRepository
    }) {
        this.#vehicleRepository = vehicleRepository;
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
            licensePlate,
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
}
export default VehicleService;