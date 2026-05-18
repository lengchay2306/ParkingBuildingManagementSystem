import mongoose from "mongoose";

const reservationSchema = mongoose.Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true,
    },
    parkingSlotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ParkingSlot",
        required: true,
    },
    reservedAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    expectedArrival: {
        type: Date,
        required: true,
    },
    expiryAt: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum: ["PENDING", "CLAIMED", "EXPIRED", "CANCELLED"],
    }
})

reservationSchema.set('toJSON', { virtuals: true });
reservationSchema.set('toObject', { virtuals: true });

const Reservation = mongoose.model("Reservation", reservationSchema);
export default Reservation;