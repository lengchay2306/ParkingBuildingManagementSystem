import Floor from "../models/Floor.js";
import ParkingSession from "../models/ParkingSession.js";
import ParkingSlot from "../models/ParkingSlot.js";
import VehicleType from "../models/VehicleType.js";

class ParkingRepository {
    findVehicleTypeByName = async ({ vehicleType }) => {
        return VehicleType.findOne({
            type: vehicleType.toUpperCase(),
        }).lean();
    }

    findParkingSlot = async (filter) => {
        const existingParkingSlot = await ParkingSlot.findOne(filter)
                                                    .populate('floorId')
                                                    .lean();

        if (!existingParkingSlot) {
            return null;
        }

        return existingParkingSlot
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
            checkInStaffId,
            status,
        }).populate([
            'vehicleId',
            'parkingSlotId',
            'checkInUserId',
            'checkInStaffId',
        ]).lean()

        return newParkingSession
    }

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

                const [slots, available, unavailable, inUsed] = await Promise.all([
                    ParkingSlot.find(slotFilter).lean(),
                    ParkingSlot.countDocuments({ floorId: floor._id, status: 'AVAILABLE' }),
                    ParkingSlot.countDocuments({ floorId: floor._id, status: 'UNAVAILABLE' }),
                    ParkingSlot.countDocuments({ floorId: floor._id, status: 'CURRENTLY-IN-USED' }),
                ]);

                return {
                    ...floor,
                    vehicleType: floor.vehicleTypeId,
                    vehicleTypeId: undefined,
                    slotStats: {
                        available,
                        unavailable,
                        inUsed,
                        total: available + unavailable + inUsed,
                    },
                    slots,
                };
            })
        );

        return result;
    }
}

export default ParkingRepository;
