import mongoose from "mongoose";

const paymentSchema = mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ParkingSession",
        // required: true,
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
    },
    // calculatedFee: {
    //     type: Number,
    //     required: true,
    // },
    // additionalFee: {
    //     type: Number,
    //     default: 0,
    // },
    amount: {
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
        enum: ['PENDING', 'PAID', 'CANCELLED'],
    },
    orderCode: {
        type: Number,
        required: true,
        unique: true,
    }
}, { timestamps: true })

paymentSchema.set("toJSON", { virtuals: true });
paymentSchema.set("toObject", { virtuals: true });

const Payment = mongoose.model("Payment", paymentSchema)
export default Payment;