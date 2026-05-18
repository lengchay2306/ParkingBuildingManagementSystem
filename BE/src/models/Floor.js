import mongoose from "mongoose";

const floorSchema = mongoose.Schema({
    floorName: {
        type: String,
        required: true,
    },
    vehicleTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "VehicleType",
    },
    totalSlot: {
        type: Number,
        required: true,
    },
});

floorSchema.set('toJSON', { virtuals: true })
floorSchema.set('toObject', { virtuals: true })

const Floor = mongoose.model("Floor", floorSchema);
export default Floor