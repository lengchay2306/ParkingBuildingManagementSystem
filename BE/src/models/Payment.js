import mongoose from "mongoose";

const paymentSchema = mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ParkingSession",
        required: true,
    },
    monthlyCardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MonthlyCard",
    },
    calculatedFee: {
        type: Number,
        required: true,
    },
    additionalFee: {
        type: Number,
        default: 0,
    },
    total: {
        type: Number,
        required: true,
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ["CASH", "CARD", "TRANSFER"],
    },
    status: {
        type: String,
        required: true,
        enum: ["UNPAID", "PAID"],
    },
    paymentTime: {
        type: Date,
        default: Date.now,
        required: true,
    },
})

paymentSchema.set("toJSON", { virtuals: true });
paymentSchema.set("toObject", { virtuals: true });

const Payment = mongoose.model("Payment", paymentSchema)
export default Payment;