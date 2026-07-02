import Floor from "../models/Floor.js";
import ParkingSession from "../models/ParkingSession.js";
import ParkingSlot from "../models/ParkingSlot.js";
import VehicleType from "../models/VehicleType.js";

class ParkingRepository {
    getFloorsWithSlots = async ({ floorId, vehicleTypeId, slotStatus }) => {
        const floorFilter = {};
        if (floorId) floorFilter._id = floorId;
        if (vehicleTypeId) floorFilter.vehicleTypeId = vehicleTypeId;

        const floors = await Floor.find(floorFilter)
            .populate('vehicleTypeId')
            .lean();

        const result = await Promise.all(
            floors.map(async (floor) => {
                const slotFilter = { floorId: floor._id };
                if (slotStatus) slotFilter.status = slotStatus;

                const [slots, available, reserved, unavailable, inUsed] = await Promise.all([
                    ParkingSlot.find(slotFilter).lean(),
                    ParkingSlot.countDocuments({ floorId: floor._id, status: 'AVAILABLE' }),
                    ParkingSlot.countDocuments({ floorId: floor._id, status: 'RESERVED' }),
                    ParkingSlot.countDocuments({ floorId: floor._id, status: 'UNAVAILABLE' }),
                    ParkingSlot.countDocuments({ floorId: floor._id, status: 'CURRENTLY-IN-USED' }),
                ]);

                return {
                    ...floor,
                    vehicleType: floor.vehicleTypeId,
                    vehicleTypeId: undefined,
                    slotStats: {
                        available,
                        reserved,
                        unavailable,
                        inUsed,
                        total: available + reserved + unavailable + inUsed,
                    },
                    slots,
                };
            })
        );

        return result;
    }
    
    findVehicleTypeByName = async ({ vehicleType }) => {
        return VehicleType.findOne({
            type: vehicleType.toUpperCase(),
        }).lean();
    }


    //PARKING SLOT----
    findParkingSlot = async (filter) => {
        const existingParkingSlot = await ParkingSlot.findOne(filter)
                                                    .populate('floorId')
                                                    .lean();

        if (!existingParkingSlot) {
            return null;
        }

        return existingParkingSlot
    }
    
    updateParkingSlot = async ({
        field,
        updateData,
    }) => {
        const updatedParkingSlot = await ParkingSlot.findOneAndUpdate(
            field,
            {
                $set: updateData
            },
            { returnDocument: 'after'},
        ).lean()

        if (!updatedParkingSlot) {
            return null
        }
        return updatedParkingSlot
    }


    //PARKING SESSION --------
    findParkingSession = async (filter) => {
        const existParkingSession = await ParkingSession.findOne(filter)
                                                        .populate([
                                                            "vehicleId",
                                                            "parkingSlotId",
                                                            "checkInUserId",
                                                            "checkOutUserId",
                                                            "checkInStaffId",
                                                            "checkOutStaffId"
                                                        ]).lean();

        if (!existParkingSession) {
            return null
        }
        
        return existParkingSession;
    }

    findAllParkingSessionByField = async (filter) => {
        const existParkingSession = await ParkingSession.find(filter)
                                                        .populate([
                                                            "vehicleId",
                                                            "parkingSlotId",
                                                            "checkInUserId",
                                                            "checkOutUserId",
                                                            "checkInStaffId",
                                                            "checkOutStaffId"
                                                        ]).lean();
        
        return existParkingSession;
    }

    createNewParkingSession = async ({
        vehicleId,
        parkingSlotId,
        sessionType,
        checkInUserId,
        checkInStaffId,
        checkInTime,
        status,
    }) => {
        const newParkingSession = await ParkingSession.create({
            vehicleId,
            parkingSlotId,
            sessionType,
            checkInUserId,
            checkInTime,
            checkInStaffId,
            status,
        })

        await newParkingSession.populate([
            'vehicleId',
            'parkingSlotId',
            'checkInUserId',
            'checkInStaffId',
        ])

        return newParkingSession.toObject()
    }

    getAllParkingSessions = async ({
        page,
        limit,
        status,
        date,
    }) => {
        const skip = (page - 1) * limit

        const filter = {}

        const targetDate = date ? new Date(date) : new Date()
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        if (status) filter.status = status;

        filter.checkInTime = {
            $gte: startOfDay,
            $lte: endOfDay,
        }

        const [parkingSessions, total] = await Promise.all([
            ParkingSession.find(filter)
                            .sort('checkInTime')
                            .skip(skip)
                            .limit(limit)
                            .populate([
                                "vehicleId",
                                "parkingSlotId",
                                "checkInUserId",
                                "checkOutUserId",
                                "checkInStaffId",
                                "checkOutStaffId",
                                "deleteStaffId",
                            ]).lean(),
            ParkingSession.countDocuments(filter)
        ]);

        const sanitizedParkingSessions = parkingSessions.map((session) => ({
            ...session,
            checkInUserId: session.checkInUserId
                            ? { ...session.checkInUserId, password: undefined }
                            : null,
            checkOutUserId: session.checkOutUserId
                            ? { ...session.checkOutUserId, password: undefined }
                            : null,
            checkInStaffId: session.checkInStaffId
                            ? { ...session.checkInStaffId, password: undefined }
                            : null,
            checkOutStaffId: session.checkOutStaffId
                            ? { ...session.checkOutStaffId, password: undefined }
                            : null,
            deleteStaffId: session.deleteStaffId
                            ? { ...session.deleteStaffId, password: undefined }
                            : null,
        }))

        return {
            parkingSessions: sanitizedParkingSessions,
            pagination: {
                currentPage: page,
                totalPage: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit,
            }
        }
    }

    updateParkingSession = async ({
        field,
        updateData,
    }) => {
        const updatedParkingSession = await ParkingSession.findOneAndUpdate(
            field,
            {
                $set: updateData
            },
            { returnDocument: 'after' }
        ).populate([
            'vehicleId',
            'parkingSlotId',
            'checkInUserId',
            'checkOutUserId',
            'checkInStaffId',
            'checkOutStaffId',
            'deleteStaffId',
        ]).lean()

        return updatedParkingSession
    }
}

export default ParkingRepository;
