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

    #hasActiveMonthlyCard = (vehicle) => {
        const monthlyCard = vehicle?.monthlyCardId;

        return monthlyCard
            && monthlyCard.status === 'ACTIVE'
            && new Date(monthlyCard.endDate) >= new Date();
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

        const vehicleId = existingParkingSession.vehicleId?._id
            ?? existingParkingSession.vehicleId;

        let hasActiveMonthlyCard = false;

        if (vehicleId) {
            const vehicle = await this.#vehicleRepository.getVehicleById({ vehicleId });

            if (vehicle) {
                hasActiveMonthlyCard = this.#hasActiveMonthlyCard(vehicle);
            }
        }

        if (!hasActiveMonthlyCard) {
            throw new BadRequestError(`Cannot find monthlyCard of this vehicle`)
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

        const slotId = existingParkingSession.parkingSlotId?._id
            ?? existingParkingSession.parkingSlotId;

        await this.#parkingRepository.updateParkingSlot({
            field: { _id: slotId },
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
        // phone,
        // licensePlate,
        staffId,
        // parkingSlotId,
        reservationId,
    }) => {
        await this.#reservationRepository.expireOverdueReservations();

        const pendingReservation = await this.#reservationRepository.findReservationById({
            reservationId,
        })

        if (!pendingReservation) {
            throw new BadRequestError(`Reservation not found!`)
        }

        if (pendingReservation.status !== 'PENDING') {
            throw new BadRequestError(`This reservation is not active pending!`)
        }

        if (new Date(pendingReservation.expiryAt) <= new Date()) {
            throw new BadRequestError(`This reservation has expired!`)
        }

        const existingUser = await this.#userRepository.findByUserId({
            userId: pendingReservation.driverId,
        })

        if (!existingUser) {
            throw new BadRequestError(`Wrong phone number or this user doesn't exist!`)
        }

        const usersVehicles = await this.#vehicleRepository.getVehicleById({
            vehicleId: pendingReservation.vehicleId,
        })

        if (!usersVehicles) {
            throw new BadRequestError(`This vehicle doesn't register yet!`)
        }

        if (String(usersVehicles.userId) !== String(existingUser._id)) {
            throw new BadRequestError(`This vehicle doesn't belong to this customer!`)
        }

        const normalizedLicensePlate = usersVehicles.licensePlate.trim().toUpperCase()

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

        const parkingSlotId = pendingReservation.parkingSlotId;

        const existingParkingSlot = await this.#parkingRepository.findParkingSlot({
            _id: parkingSlotId,
        });

        if (!existingParkingSlot) {
            throw new BadRequestError(`Reserved parking slot not found!`)
        }

        if (existingParkingSlot.status !== 'RESERVED') {
            throw new BadRequestError(`Reserved slot is not in RESERVED status!`)
        }

        // const vehicleTypeIdFromVehicles = usersVehicles.vehicleTypeId?._id ||
        //                                 usersVehicles.vehicleTypeId;

        // const vehicleTypeIdFromSlot = existingParkingSlot.floorId?.vehicleTypeId?._id ||
        //                             existingParkingSlot.floorId?.vehicleTypeId

        // if (String(vehicleTypeIdFromVehicles) !== String(vehicleTypeIdFromSlot) ) {
        //     throw new BadRequestError(`This slot is not fit with this type of vehicle`)
        // }

        const hasActiveMonthlyCard = this.#hasActiveMonthlyCard(usersVehicles);

        const newParkingSession = await this.#parkingRepository.createNewParkingSession({
            vehicleId: usersVehicles._id,
            licensePlate: normalizedLicensePlate,
            parkingSlotId: existingParkingSlot._id,
            sessionType: hasActiveMonthlyCard ? "MONTH" : "DAILY",
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

        await this.#reservationRepository.claimReservationByVehicleAndSlot({
            vehicleId: usersVehicles._id,
            parkingSlotId: existingParkingSlot._id,
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

        const registeredVehicle = await this.#vehicleRepository.getVehicleByLicensePlate({
            licensePlate: normalizedLicensePlate,
        });

        if (registeredVehicle) {
            throw new BadRequestError(
                `This license plate is registered. Use walk-in check-in (POST /parking/create-parking-session/walk-in) instead of guest.`,
            );
        }

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

    /**
     * Registered walk-in (no reservation): customer vehicle enters without prior booking.
     * Sets MONTH vs DAILY from active monthly card; isGuest = false.
     */
    createNewParkingSessionForRegisteredWalkIn = async ({
        phone,
        licensePlate,
        staffId,
        parkingSlotId,
    }) => {
        await this.#reservationRepository.expireOverdueReservations();

        const existingUser = await this.#userRepository.findUser({ phone });
        if (!existingUser) {
            throw new BadRequestError(`Wrong phone number or this user doesn't exist!`);
        }

        const normalizedLicensePlate = licensePlate.trim().toUpperCase();
        const usersVehicles = await this.#vehicleRepository.getVehicleByLicensePlate({
            licensePlate: normalizedLicensePlate,
        });

        if (!usersVehicles) {
            throw new BadRequestError(`This vehicle doesn't register yet! Use guest check-in for walk-in guests.`);
        }

        if (usersVehicles.status && usersVehicles.status !== 'ACTIVE') {
            throw new BadRequestError(`This vehicle is not active!`);
        }

        if (String(usersVehicles.userId) !== String(existingUser._id)) {
            throw new BadRequestError(`This vehicle doesn't belong to this customer!`);
        }

        const pendingReservation = await this.#reservationRepository.findPendingReservationByVehicleAndDriver({
            vehicleId: usersVehicles._id,
            driverId: existingUser._id,
        });

        if (pendingReservation) {
            throw new BadRequestError(
                `This vehicle has an active PENDING reservation. Use reservation check-in with reservationId: ${pendingReservation._id}`,
            );
        }

        const isAlreadyInParkingSession = await this.#parkingRepository.findAllParkingSessionByField({
            status: 'ACTIVE',
            $or: [
                { vehicleId: usersVehicles._id },
                { licensePlate: normalizedLicensePlate },
            ],
        });

        if (isAlreadyInParkingSession.length > 0) {
            throw new BadRequestError(`This vehicle already in parking building!`);
        }

        const existingParkingSlot = await this.#parkingRepository.findParkingSlot({
            _id: parkingSlotId,
        });

        if (!existingParkingSlot || existingParkingSlot.status !== 'AVAILABLE') {
            throw new BadRequestError(`This parking slot is not available!`);
        }

        const vehicleTypeIdFromVehicles = usersVehicles.vehicleTypeId?._id
            || usersVehicles.vehicleTypeId;
        const vehicleTypeIdFromSlot = existingParkingSlot.floorId?.vehicleTypeId?._id
            || existingParkingSlot.floorId?.vehicleTypeId;

        if (String(vehicleTypeIdFromVehicles) !== String(vehicleTypeIdFromSlot)) {
            throw new BadRequestError(`This slot is not fit with this type of vehicle`);
        }

        const hasActiveMonthlyCard = this.#hasActiveMonthlyCard(usersVehicles);

        const newParkingSession = await this.#parkingRepository.createNewParkingSession({
            vehicleId: usersVehicles._id,
            licensePlate: normalizedLicensePlate,
            parkingSlotId: existingParkingSlot._id,
            sessionType: hasActiveMonthlyCard ? 'MONTH' : 'DAILY',
            checkInUserId: existingUser._id,
            checkInStaffId: staffId,
            checkInTime: Date.now(),
            status: 'ACTIVE',
            isGuest: false,
        });

        if (!newParkingSession) {
            throw new BadRequestError(`Cannot create new parking session!`);
        }

        await this.#parkingRepository.updateParkingSlot({
            field: { _id: existingParkingSlot._id },
            updateData: {
                status: 'CURRENTLY-IN-USED',
            },
        });

        return {
            ...newParkingSession,
            parkingSlotId: {
                ...newParkingSession.parkingSlotId,
                status: 'CURRENTLY-IN-USED',
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
            status: 'ACTIVE',
        })

        if (!existingParkingSession) {
            throw new NotFoundError(`This parking session does not exist`)
        }

        return {
            ...existingParkingSession,
            checkInUserId: existingParkingSession.checkInUserId
                ? { ...existingParkingSession.checkInUserId, password: undefined }
                : null,
            checkOutUserId: existingParkingSession.checkOutUserId
                ? { ...existingParkingSession.checkOutUserId, password: undefined }
                : null,
            checkInStaffId: existingParkingSession.checkInStaffId
                ? { ...existingParkingSession.checkInStaffId, password: undefined }
                : null,
            checkOutStaffId: existingParkingSession.checkOutStaffId
                ? { ...existingParkingSession.checkOutStaffId, password: undefined }
                : null,
        }
    }

    getSessionActiveByLicensePlate = async ({
        licensePlate,
    }) => {
        const normalizedLicensePlate = licensePlate.trim().replace(/\s+/g, ' ').toUpperCase();

        const vehicle = await this.#vehicleRepository.getVehicleByLicensePlate({
            licensePlate: normalizedLicensePlate,
        });

        const orConditions = [{ licensePlate: normalizedLicensePlate }];
        if (vehicle?._id) {
            orConditions.push({ vehicleId: vehicle._id });
        }

        const existingParkingSession = await this.#parkingRepository.findParkingSession({
            status: 'ACTIVE',
            $or: orConditions,
        });

        if (!existingParkingSession) {
            throw new NotFoundError(`No active parking session found for this license plate`);
        }

        return {
            ...existingParkingSession,
            checkInUserId: existingParkingSession.checkInUserId
                ? { ...existingParkingSession.checkInUserId, password: undefined }
                : null,
            checkOutUserId: existingParkingSession.checkOutUserId
                ? { ...existingParkingSession.checkOutUserId, password: undefined }
                : null,
            checkInStaffId: existingParkingSession.checkInStaffId
                ? { ...existingParkingSession.checkInStaffId, password: undefined }
                : null,
            checkOutStaffId: existingParkingSession.checkOutStaffId
                ? { ...existingParkingSession.checkOutStaffId, password: undefined }
                : null,
        };
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
