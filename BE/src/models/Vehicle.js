import mongoose from "mongoose";

const vehicleSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    licensePlate: {
        type: String,
        required: true,
        trim: true,
    },
    vehicleTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VehicleType",
        required: true,
    },
    monthlyCardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MonthlyCard",
        default: null,
    },
}, { timestamps: true });

vehicleSchema.set('toJSON', { virtuals: true });
vehicleSchema.set('toObject', { virtuals: true });

const Vehicle = mongoose.model("Vehicle", vehicleSchema);
export default Vehicle