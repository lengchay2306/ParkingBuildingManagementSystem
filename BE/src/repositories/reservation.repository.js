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
        reservedAt,
        expiryAt,
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

    findReservationById = async ({ reservationId }) => {
        return Reservation.findById(reservationId).lean();
    }

    findReservationsByDriverId = async ({ driverId, status }) => {
        const filter = { driverId };
        if (status) filter.status = status;

        return Reservation.find(filter)
            .populate({
                path: 'vehicleId',
                populate: { path: 'vehicleTypeId' },
            })
            .populate({
                path: 'parkingSlotId',
                populate: {
                    path: 'floorId',
                    populate: { path: 'vehicleTypeId' },
                },
            })
            .sort({ createdAt: -1 })
            .lean();
    }

    getAllReservations = async ({ filter = {}, page = 1, limit = 10 }) => {
        const skip = (page - 1) * limit;

        const [reservations, totalCount] = await Promise.all([
            Reservation.find(filter)
                .populate('driverId', '-password')
                .populate({
                    path: 'vehicleId',
                    populate: { path: 'vehicleTypeId' },
                })
                .populate({
                    path: 'parkingSlotId',
                    populate: {
                        path: 'floorId',
                        populate: { path: 'vehicleTypeId' },
                    },
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Reservation.countDocuments(filter),
        ]);

        return {
            reservations,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    }

    cancelReservation = async ({ reservationId }) => {
        const cancelledReservation = await Reservation.findByIdAndUpdate(reservationId, { status: "CANCELLED" }, { new: true });
        return cancelledReservation;
    }
}

export default ReservationRepository;
