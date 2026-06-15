import { BadRequestError, NotFoundError } from "../error/error.js";

class ParkingService {
    #parkingRepository;
    #userRepository
    #vehicleRepository
    constructor({ 
        parkingRepository,
        userRepository, 
        vehicleRepository,
    }) {
        this.#parkingRepository = parkingRepository;
        this.#userRepository = userRepository;
        this.#vehicleRepository = vehicleRepository;
    }

    createNewParkingSession = async ({
        phone,
        licensePlate,
        staffId,
        parkingSlotId,
    }) => {
        const existingUser = await this.#userRepository.findUser({
            phone: phone,
        })

        if (!existingUser) {
            throw new BadRequestError(`Wrong phone number or this user doesn't exist!`)
        }

        const usersVehicles = await this.#vehicleRepository.getVehicleByLicensePlate({
            licensePlate: licensePlate
        })

        if (!usersVehicles) {
            throw new BadRequestError(`This vehicle doesn't register yet!`)
        }

        const existingParkingSlot = await this.#parkingRepository.findParkingSlot({
            _id: parkingSlotId,
        });

        if (!existingParkingSlot || existingParkingSlot.status !== 'AVAILABLE') {
            throw new BadRequestError(`This parking slot is not available!`)
        }

        const newParkingSession = await this.#parkingRepository.createNewParkingSession({
            vehicleId: usersVehicles._id,
            parkingSlotId: existingParkingSlot._id,
            sessionType: usersVehicles.monthlyCardId ? "MONTH" : "DAILY",
            checkInUserId: existingUser._id,
            checkInStaffId: staffId,
            checkInTime: Date.now(),
            status: "ACTIVE",
        })

        if (newParkingSession) {
            throw new BadRequestError(`Cannot create new parking session!`)
        }

        return newParkingSession;
    }

    getParkingSlots = async ({ vehicleType, floorId, status }) => {
        let vehicleTypeId = null;

        if (vehicleType) {
            const matched = await this.#parkingRepository.findVehicleTypeByName({ vehicleType });
            if (!matched) {
                throw new NotFoundError(`Vehicle type '${vehicleType}' not found`);
            }
            vehicleTypeId = matched._id;
        }

        if (status) {
            const validStatuses = ['AVAILABLE', 'UNAVAILABLE', 'CURRENTLY-IN-USED'];
            if (!validStatuses.includes(status.toUpperCase())) {
                throw new BadRequestError(
                    `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`
                );
            }
        }

        const floors = await this.#parkingRepository.getFloorsWithSlots({
            floorId,
            vehicleTypeId,
            slotStatus: status ? status.toUpperCase() : null,
        });

        if (floorId && floors.length === 0) {
            throw new NotFoundError(`Floor not found`);
        }

        return floors;
    }
}

export default ParkingService;
