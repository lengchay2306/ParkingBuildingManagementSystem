import { BadRequestError, NotFoundError } from "../error/error.js";

function parseSlotIndex(slotNumber) {
    const digits = String(slotNumber ?? "").replace(/\D/g, "");
    const parsed = parseInt(digits, 10);
    return Number.isFinite(parsed) ? parsed : 99;
}

function scoreSlot({
    slot,
    floorStats,
    driverHistorySlotIds,
    peakSessionCount,
}) {
    let score = 0;
    const reasons = [];

    const slotIndex = parseSlotIndex(slot.slotNumber);
    const proximityScore = Math.max(0, 30 - Math.floor(slotIndex / 2));
    score += proximityScore;
    if (proximityScore >= 20) {
        reasons.push("Gần lối vào tầng");
    }

    const availabilityRate = floorStats.total > 0
        ? floorStats.available / floorStats.total
        : 0;
    const availabilityScore = Math.round(availabilityRate * 25);
    score += availabilityScore;
    if (availabilityRate >= 0.5) {
        reasons.push("Tầng còn nhiều chỗ trống");
    }

    if (driverHistorySlotIds.has(String(slot._id))) {
        score += 20;
        reasons.push("Bạn từng đặt slot này trước đây");
    }

    const peakPenalty = Math.min(15, peakSessionCount * 3);
    score += 15 - peakPenalty;
    if (peakPenalty >= 9) {
        reasons.push("Nhiều xe ra/vào khung giờ này — ưu tiên vị trí thuận tiện");
    }

    if (slotIndex % 2 === 0) {
        score += 10;
        reasons.push("Vị trí thuận tiện ra vào");
    }

    if (reasons.length === 0) {
        reasons.push("Slot phù hợp loại xe và còn trống");
    }

    const floor = slot.floorId;

    return {
        parkingSlotId: slot._id,
        slotNumber: slot.slotNumber,
        status: slot.status,
        floorId: floor?._id ?? slot.floorId,
        floorName: floor?.floorName ?? null,
        vehicleType: floor?.vehicleTypeId?.type ?? null,
        score,
        reasons,
    };
}

class SlotRecommendationService {
    #reservationRepository;
    #parkingRepository;

    constructor({ reservationRepository, parkingRepository }) {
        this.#reservationRepository = reservationRepository;
        this.#parkingRepository = parkingRepository;
    }

    recommendSlots = async ({
        driverId,
        vehicleId,
        expectedArrival,
        limit = 3,
    }) => {
        await this.#reservationRepository.expireOverdueReservations();

        const now = Date.now();
        const arrivalMs = expectedArrival.getTime();
        const twoHoursFromNow = now + 2 * 60 * 60 * 1000;

        if (arrivalMs <= now) {
            throw new BadRequestError("expectedArrival must be a future date");
        }

        if (arrivalMs > twoHoursFromNow) {
            throw new BadRequestError("expectedArrival must be within 2 hours from now");
        }

        const vehicle = await this.#reservationRepository.findVehicleById({ vehicleId });
        if (!vehicle) {
            throw new NotFoundError("Vehicle not found");
        }

        if (vehicle.userId.toString() !== driverId.toString()) {
            throw new BadRequestError("This vehicle does not belong to you");
        }

        const vehicleTypeId = vehicle.vehicleTypeId?._id?.toString()
            ?? vehicle.vehicleTypeId?.toString();

        const availableSlots = await this.#reservationRepository.findAvailableSlotsForVehicleType({
            vehicleTypeId,
        });

        if (availableSlots.length === 0) {
            throw new NotFoundError("No available slots for this vehicle type");
        }

        const slotIds = availableSlots.map((slot) => slot._id);
        const activeReservations = await this.#reservationRepository.findActiveReservationsBySlotIds({
            parkingSlotIds: slotIds,
        });
        const blockedSlotIds = new Set(
            activeReservations.map((reservation) => String(reservation.parkingSlotId)),
        );

        const eligibleSlots = availableSlots.filter(
            (slot) => !blockedSlotIds.has(String(slot._id)),
        );

        if (eligibleSlots.length === 0) {
            throw new NotFoundError("No available slots for this vehicle type");
        }

        const floorId = eligibleSlots[0].floorId?._id?.toString()
            ?? eligibleSlots[0].floorId?.toString();

        const [floorStats, peakSessionCount, driverHistorySlotIds] = await Promise.all([
            this.#parkingRepository.getFloorSlotStats({ floorId }),
            this.#parkingRepository.countActiveSessionsOnFloorNearTime({
                floorId,
                expectedArrival,
            }),
            this.#reservationRepository.findDriverPastReservationSlotIds({ driverId }),
        ]);

        const driverHistorySet = new Set(driverHistorySlotIds);

        const recommendations = eligibleSlots
            .map((slot) => scoreSlot({
                slot,
                floorStats,
                driverHistorySlotIds: driverHistorySet,
                peakSessionCount,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return {
            vehicle: {
                _id: vehicle._id,
                licensePlate: vehicle.licensePlate,
                vehicleTypeId: vehicle.vehicleTypeId,
            },
            expectedArrival,
            recommendations,
            meta: {
                totalEligibleSlots: eligibleSlots.length,
                floorOccupancyRate: floorStats.total > 0
                    ? Number(((floorStats.total - floorStats.available) / floorStats.total).toFixed(2))
                    : 0,
                floorStats,
            },
        };
    };
}

export default SlotRecommendationService;
