import { BadRequestError, NotFoundError } from "../error/error.js";

class ParkingService {
    #parkingRepository;
    #userRepository
    #vehicleRepository
    #reservationRepository
    constructor({ 
        parkingRepository,
        userRepository, 
        vehicleRepository,
        reservationRepository,
    }) {
        this.#parkingRepository = parkingRepository;
        this.#userRepository = userRepository;
        this.#vehicleRepository = vehicleRepository;
        this.#reservationRepository = reservationRepository;
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

        const normalizedLicensePlate = licensePlate.trim().toUpperCase()

        const isAlreadyInParkingSession = await this.#parkingRepository.findAllParkingSessionByField({
            //because when input user vehicleId, it will include all old parking sessions
            //so i call findAllParkingSessionByField function
            status: 'ACTIVE',
            $or: [
                { vehicleId: usersVehicles._id },
                { licensePlate: normalizedLicensePlate }
            ],
        })

        if (isAlreadyInParkingSession.length > 0) {
            throw new BadRequestError(`This vehicle already in parking building!`)
        }

        const existingParkingSlot = await this.#parkingRepository.findParkingSlot({
            _id: parkingSlotId,
        });

        if (
            !existingParkingSlot
            || existingParkingSlot.status === 'CURRENTLY-IN-USED'
            || existingParkingSlot.status === 'UNAVAILABLE'
        ) {
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
            licensePlate: normalizedLicensePlate,
            parkingSlotId: existingParkingSlot._id,
            sessionType: usersVehicles.monthlyCardId ? "MONTH" : "DAILY",
            checkInUserId: existingUser._id,
            checkInStaffId: staffId,
            checkInTime: Date.now(),
            status: "ACTIVE",
            isGuest: false,
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
    
    createNewParkingSessionForGuest = async ({
        phone,
        licensePlate,
        staffId,
        parkingSlotId,
        vehicleTypeId,
    }) => {
        const normalizedLicensePlate = licensePlate.trim().toUpperCase()
        const isAlreadyInParkingSession = await this.#parkingRepository.findAllParkingSessionByField({
            //because when input user vehicleId, it will include all old parking sessions
            //so i call findAllParkingSessionByField function
            licensePlate: normalizedLicensePlate,
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

        const vehicleTypeIdFromVehicles = vehicleTypeId

        const vehicleTypeIdFromSlot = existingParkingSlot.floorId?.vehicleTypeId?._id ||
                                    existingParkingSlot.floorId?.vehicleTypeId

        if (String(vehicleTypeIdFromVehicles) !== String(vehicleTypeIdFromSlot) ) {
            throw new BadRequestError(`This slot is not fit with this type of vehicle`)
        }

        const newParkingSession = await this.#parkingRepository.createNewParkingSession({
            parkingSlotId: existingParkingSlot._id,
            sessionType: "DAILY",
            checkInStaffId: staffId,
            checkInTime: Date.now(),
            status: "ACTIVE",
            licensePlate: normalizedLicensePlate,
            isGuest: true
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
            checkInUserId: newParkingSession.checkInUserId
                ? { ...newParkingSession.checkInUserId, password: undefined }
                : null,
            checkInStaffId: newParkingSession.checkInStaffId
                ? { ...newParkingSession.checkInStaffId, password: undefined }
                : null,
        };
    }

    deleteErrorParkingSession = async ({
        staffId,
        parkingSessionId,
    }) => {
        const existingStaff = await this.#userRepository.findByUserId({
            userId: staffId,
        })

        if (!existingStaff) {
            throw new NotFoundError(`Cannot find this user from token!`)
        }

        const existingParkingSession = await this.#parkingRepository.findParkingSession({
            _id: parkingSessionId,
        });

        if (!existingParkingSession || existingParkingSession.status !== 'ACTIVE') {
            throw new BadRequestError(`You cant delete this session`)
        }

        const updatedParkingSession = await this.#parkingRepository.updateParkingSession({
            field: { _id: existingParkingSession._id },
            updateData: {
                deleteStaffId: staffId,
            },
        })

        if (!updatedParkingSession) {
            throw new BadRequestError(`Cannot delete this parking session!`)
        }

        await this.#parkingRepository.updateParkingSlot({
            field: { _id: existingParkingSession.parkingSlotId },

        })

        return {
            ...updatedParkingSession,
            parkingSlotId: {
                ...updatedParkingSession.parkingSlotId,
                status: 'ACTIVE'
            },
            checkInUserId: {
                ...updatedParkingSession.checkInUserId,
                password: undefined,
            },
            checkInStaffId: {
                ...updatedParkingSession.checkInStaffId,
                password: undefined,
            },
            deleteStaffId: {
                ...updatedParkingSession.deleteStaffId,
                password: undefined,
            },
        }
    }

    getAllParkingSessions = async ({
        page,
        limit,
        status,
        date
    }) => {
        const {
            parkingSessions,
            pagination
        } = await this.#parkingRepository.getAllParkingSessions({
            page,
            limit,
            status,
            date
        })

        if (parkingSessions.length === 0) {
            throw new BadRequestError(`No data! Or cannot get all parking session!`)
        }

        return {
            parkingSessions,
            pagination,
        };
    }

    getUserParkingSessions = async ({
        vehicleId,
    }) => {
        const existingParkingSession = await this.#parkingRepository.findParkingSession({
            vehicleId: vehicleId,
        })

        if (!existingParkingSession) {
            throw new BadRequestError(`This parking session does not exist`)
        }

        return {
            ...existingParkingSession,
            checkInUserId: {
                ...existingParkingSession.checkInUserId,
                password: undefined,
            },
            checkOutUserId: {
                ...existingParkingSession.checkOutUserId,
                password: undefined,
            },
            checkInStaffId: {
                ...existingParkingSession.checkInStaffId,
                password: undefined,
            },
            checkOutStaffId: {
                ...existingParkingSession.checkOutStaffId,
                password: undefined,
            },
        }
    }

    //-----------------

    getParkingSlots = async ({ vehicleType, floorId, status }) => {
        await this.#reservationRepository.expireOverdueReservations();

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
