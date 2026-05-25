import Reservation from "../models/Reservation.js";
import Vehicle from "../models/Vehicle.js";
import ParkingSlot from "../models/ParkingSlot.js";

class ReservationRepository {
    findVehicleById = async ({ vehicleId }) => {
        return Vehicle.findById(vehicleId).lean();
    }

    findParkingSlotById = async ({ parkingSlotId }) => {
        return ParkingSlot.findById(parkingSlotId)
            .populate({
                path: 'floorId',
                populate: { path: 'vehicleTypeId' },
            })
            .lean();
    }

    findActiveReservationBySlot = async ({ parkingSlotId }) => {
        return Reservation.findOne({
            parkingSlotId,
            status: { $in: ['PENDING', 'CLAIMED'] },
        }).lean();
    }

    createReservation = async ({
        driverId,
        vehicleId,
        parkingSlotId,
        expectedArrival,
        reservedAt = Date.now(),
        expiryAt = new Date(Date.now() + 1000 * 60 * 60 * 24),
        status = "PENDING",
    }) => {
        const newReservation = await Reservation.create({
            driverId,
            vehicleId,
            parkingSlotId,
            expectedArrival,
            reservedAt,
            expiryAt,
            status,
        });

        return newReservation.toObject();
    }
}

export default ReservationRepository;
