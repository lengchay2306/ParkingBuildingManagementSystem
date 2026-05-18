import mongoose from "mongoose";

const vehicleTypeSchema = mongoose.Schema({
    type: {
        type: String,
        required: true,
        trim: true,
        enum: ["SEDAN", "SUV", "MPV", "PICKUP"],
    }
})

const VehicleType = mongoose.model("VehicleType", vehicleTypeSchema)
export default VehicleType;