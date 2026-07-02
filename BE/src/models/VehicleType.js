import mongoose from "mongoose";

const vehicleTypeSchema = mongoose.Schema({
    type: {
        type: String,
        required: true,
        trim: true,
        enum: [
            "SEDAN",
            "SUV",
            "EBIKE",
            "ECAR",
            "MOTORBIKE",
            "BIKE",
            "HATCHBACK",
            "CUV",
            "MPV",
            "PICKUP",
        ],
    }
})

const VehicleType = mongoose.model("VehicleType", vehicleTypeSchema)
export default VehicleType;