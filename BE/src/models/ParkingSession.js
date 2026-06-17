import mongoose from "mongoose";

const parkingSessionSchema = mongoose.Schema({
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
    sessionType: {
        type: String,
        required: true,
        enum: ["DAILY", "MONTH"],
    },
    checkInUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    checkOutUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    checkInStaffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    checkOutStaffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    checkInTime: {
        type: Date,
        required: true,
        default: Date.now,
    },
    checkOutTime: {
        type: Date,
        default: null,
    },
    status: {
        type: String,
        required: true,
        enum: ["ACTIVE", "COMPLETED"],
    },
})

parkingSessionSchema.set('toJSON', { virtuals: true })
parkingSessionSchema.set('toObject', { virtuals: true });

const ParkingSession = mongoose.model("ParkingSession", parkingSessionSchema);
export default ParkingSession;