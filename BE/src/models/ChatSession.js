import mongoose from "mongoose";

const chatSessionSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
        default: "Cuộc trò chuyện mới",
    },
    model: {
        type: String,
        required: true,
    },
    lastMessageAt: {
        type: Date,
        default: Date.now,
    },
    messageCount: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

chatSessionSchema.set("toJSON", { virtuals: true });
chatSessionSchema.set("toObject", { virtuals: true });

const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
export default ChatSession;
