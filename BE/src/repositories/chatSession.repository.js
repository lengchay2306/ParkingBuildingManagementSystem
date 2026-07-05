import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";

const MAX_GEMINI_HISTORY = 20;

class ChatSessionRepository {
    createSession = async ({ userId, title, model }) => {
        const session = await ChatSession.create({
            userId,
            title,
            model,
            lastMessageAt: new Date(),
            messageCount: 0,
        });
        return session.toObject();
    }

    createMessage = async ({ sessionId, userId, role, content }) => {
        const message = await ChatMessage.create({
            sessionId,
            userId,
            role,
            content,
        });
        return message.toObject();
    }

    findSessionById = async ({ sessionId, userId }) => {
        return ChatSession.findOne({ _id: sessionId, userId }).lean();
    }

    findSessionsByUserId = async ({ userId, page = 1, limit = 20 }) => {
        const skip = (page - 1) * limit;

        const [sessions, totalCount] = await Promise.all([
            ChatSession.find({ userId })
                .sort({ lastMessageAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ChatSession.countDocuments({ userId }),
        ]);

        return {
            sessions,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    }

    findMessagesBySessionId = async ({ sessionId, userId }) => {
        return ChatMessage.find({ sessionId, userId })
            .sort({ createdAt: 1 })
            .lean();
    }

    findRecentMessagesForGemini = async ({ sessionId, userId, limit = MAX_GEMINI_HISTORY }) => {
        const messages = await ChatMessage.find({ sessionId, userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("role content")
            .lean();

        return messages.reverse();
    }

    updateSessionAfterMessage = async ({ sessionId, title, incrementBy = 2 }) => {
        const updateQuery = {
            $set: { lastMessageAt: new Date() },
            $inc: { messageCount: incrementBy },
        };

        if (title) {
            updateQuery.$set.title = title;
        }

        return ChatSession.findByIdAndUpdate(
            sessionId,
            updateQuery,
            { new: true },
        ).lean();
    }

    deleteSession = async ({ sessionId, userId }) => {
        const session = await ChatSession.findOneAndDelete({ _id: sessionId, userId });
        if (!session) {
            return null;
        }

        await ChatMessage.deleteMany({ sessionId, userId });
        return session.toObject();
    }
}

export default ChatSessionRepository;
