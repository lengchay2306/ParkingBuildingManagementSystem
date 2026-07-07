import mongoose from "mongoose";

const monthlyCardSchema = mongoose.Schema({
    // cardCode: {
    //     type: String,
    //     required: true,
    //     trim: true,
    // },
    startDate: {
        type: Date,
        default: Date.now,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum: ["ACTIVE", "EXPIRED"],
    },
    pricePolicyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PricePolicy",
        required: true,
    }
}, { timestamps: true });

monthlyCardSchema.set('toJSON', { virtuals: true });
monthlyCardSchema.set('toObject', { virtuals: true });

const MonthlyCard = mongoose.model("MonthlyCard", monthlyCardSchema);
export default MonthlyCard;