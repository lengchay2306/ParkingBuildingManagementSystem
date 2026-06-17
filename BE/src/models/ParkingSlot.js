import mongoose from "mongoose";

const parkingSlotSchema = mongoose.Schema({
    floorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Floor",
    },
    slotNumber: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["AVAILABLE", "RESERVED", "UNAVAILABLE", "CURRENTLY-IN-USED"],
        required: true,
    },
}, { timestamps: true });

parkingSlotSchema.set('toJSON', { virtuals: true });
parkingSlotSchema.set('toObject', { virtuals: true });

const ParkingSlot = mongoose.model("ParkingSlot", parkingSlotSchema);
export default ParkingSlot;