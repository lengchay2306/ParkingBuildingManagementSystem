import mongoose from "mongoose";

const pricePolicySchema = mongoose.Schema({
    vehicleTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "VehicleType",
    },
    policyName: {
        type: String,
        required: true,
        trim: true,
    },
    fromHour: {
        type: Number,
        required: true,
        default: 0,
    },
    toHour: {
        type: Number,
        required: true,
    },
    ratePerHour: {
        type: Number,
        required: true,
    },
    monthlyRate: {
        type: Number,
        default: null,
    },
})

pricePolicySchema.set("toJSON", { virtuals: true })
pricePolicySchema.set("toObject", { virtuals: true })

const PricePolicy = mongoose.model("PricePolicy", pricePolicySchema);
export default PricePolicy;