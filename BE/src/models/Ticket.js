import mongoose from "mongoose";

const ticketSchema = mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ParkingSession",
        required: true,
    },
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ["FEEDBACK", "INCIDENT"],
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    status: {
        type: String,
        required: true,
        enum: ["PENDING", "RESOLVED"],
    },
}, { timestamps: true });

ticketSchema.set("toJSON", { virtuals: true })
ticketSchema.set("toObject", { virtuals: true })

const Ticket = mongoose.model("Ticket", ticketSchema)
export default Ticket;