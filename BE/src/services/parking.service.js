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

    checkoutParkingSession = async ({
        parkingSessionId,
        userPhone,
        checkOutStaffId,
    }) => {
        const existingParkingSession = await this.#parkingRepository.findParkingSession({
            _id: parkingSessionId,
        })

        if (!existingParkingSession || existingParkingSession.status !== "ACTIVE") {
            throw new BadRequestError(`This parking session is not exist or already checkout!`)
        }

        const existingUser = await this.#userRepository.findUser({
            phone: userPhone,
        })

        if (!existingUser) {
            throw new BadRequestError(`This user does not register yet!`)
        }

        const updatedParkingSession = await this.#parkingRepository.updateParkingSession({
            field: { _id: parkingSessionId },
            updateData: {
                checkOutUserId: existingUser._id,
                checkOutStaffId: checkOutStaffId,
                checkOutTime: Date.now(),
                status: 'COMPLETED',
            }
        })

        if (!updatedParkingSession) {
            throw new BadRequestError(`Cannot check out this parking session`)
        }

        await this.#parkingRepository.updateParkingSlot({
            field: { _id: existingParkingSession.parkingSlotId },
            updateData: {
                status: 'AVAILABLE'
            }
        })
        return {
            ...updatedParkingSession,
            parkingSlotId: {
                ...updatedParkingSession.parkingSlotId,
                status: 'AVAILABLE'
            },
            checkInUserId: {
                ...updatedParkingSession.checkInUserId,
                password: undefined,
            },
            checkOutUserId: {
                ...updatedParkingSession.checkOutUserId,
                password: undefined,
            },
            checkInStaffId: {
                ...updatedParkingSession.checkInStaffId,
                password: undefined,
            },
            checkOutStaffId: {
                ...updatedParkingSession.checkOutStaffId,
                password: undefined,
            },
        };
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

        const isAlreadyInParkingSession = await this.#parkingRepository.findAllParkingSessionOfVehicles({
            vehicleId: usersVehicles._id,
            status: 'ACTIVE',
        })

        if (isAlreadyInParkingSession.length > 0) {
            throw new BadRequestError(`This vehicle already in parking building!`)
        }

        const existingParkingSlot = await this.#parkingRepository.findParkingSlot({
            _id: parkingSlotId,
        });

        if (!existingParkingSlot || existingParkingSlot.status !== 'AVAILABLE') {
            throw new BadRequestError(`This parking slot is not available!`)
        }

        const vehicleTypeIdFromVehicles = usersVehicles.vehicleTypeId?._id ||
                                        usersVehicles.vehicleTypeId;

        const vehicleTypeIdFromSlot = existingParkingSlot.floorId?.vehicleTypeId?._id ||
                                    existingParkingSlot.floorId?.vehicleTypeId

        if (String(vehicleTypeIdFromVehicles) !== String(vehicleTypeIdFromSlot) ) {
            throw new BadRequestError(`This slot is not fit with this type of vehicle`)
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

        if (!newParkingSession) {
            throw new BadRequestError(`Cannot create new parking session!`)
        }

        await this.#parkingRepository.updateParkingSlot({
            field: { _id: existingParkingSlot._id },
            updateData: {
                status: 'CURRENTLY-IN-USED',
            }
        })
        return {
            ...newParkingSession,
            parkingSlotId: {
                ...newParkingSession.parkingSlotId,
                status: 'CURRENTLY-IN-USED'
            },
            checkInUserId: {
                ...newParkingSession.checkInUserId,
                password: undefined,
            },
            checkInStaffId: {
                ...newParkingSession.checkInStaffId,
                password: undefined,
            }
        };
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
            const validStatuses = ['AVAILABLE', 'RESERVED', 'UNAVAILABLE', 'CURRENTLY-IN-USED'];
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
