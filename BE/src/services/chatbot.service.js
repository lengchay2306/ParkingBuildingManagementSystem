import {
    CHATBOT_REFUSAL_HINT,
    CHATBOT_SYSTEM_PROMPT,
    CHATBOT_WELCOME_MESSAGE,
} from "../constants/chatbot.context.js";
import { BadRequestError, NotFoundError, ServiceUnavailableError } from "../error/error.js";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_SESSION_TITLE = "Cuộc trò chuyện mới";
const AUTO_TITLE_MAX_LENGTH = 60;

function buildRoleContext({ roleName, fullName }) {
    const name = fullName ? `Tên người dùng: ${fullName}.` : "";
    return `${name} Vai trò hiện tại: ${roleName}. Ưu tiên hướng dẫn phù hợp vai trò này.`;
}

function mapHistoryToGeminiContents(history = []) {
    return history.map((entry) => ({
        role: entry.role === "assistant" ? "model" : "user",
        parts: [{ text: entry.content }],
    }));
}

function buildAutoTitle(message) {
    const normalized = message.trim().replace(/\s+/g, " ");
    if (normalized.length <= AUTO_TITLE_MAX_LENGTH) {
        return normalized;
    }
    return `${normalized.slice(0, AUTO_TITLE_MAX_LENGTH - 1)}…`;
}

class ChatbotService {
    #chatSessionRepository;
    #apiKey;
    #model;

    constructor({ chatSessionRepository }) {
        this.#chatSessionRepository = chatSessionRepository;
        this.#apiKey = process.env.GEMINI_API_KEY;
        this.#model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    }

    #ensureConfigured() {
        if (!this.#apiKey) {
            throw new ServiceUnavailableError(
                "Chatbot is not configured. Set GEMINI_API_KEY in environment variables.",
            );
        }
    }

    #getModel() {
        return this.#model;
    }

    async #callGemini({ message, history, roleName, fullName }) {
        this.#ensureConfigured();

        const trimmedMessage = message.trim();
        if (!trimmedMessage) {
            throw new BadRequestError("Message cannot be empty");
        }

        const systemPrompt = `${CHATBOT_SYSTEM_PROMPT}\n\n## NGỮ CẢNH PHIÊN\n${buildRoleContext({ roleName, fullName })}`;

        const payload = {
            systemInstruction: {
                parts: [{ text: systemPrompt }],
            },
            contents: [
                ...mapHistoryToGeminiContents(history),
                {
                    role: "user",
                    parts: [{ text: trimmedMessage }],
                },
            ],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            ],
        };

        const url = `${GEMINI_API_BASE}/models/${this.#getModel()}:generateContent?key=${this.#apiKey}`;

        let response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        } catch {
            throw new ServiceUnavailableError("Unable to reach chatbot service");
        }

        const data = await response.json();

        if (!response.ok) {
            const apiMessage = data?.error?.message ?? "Chatbot request failed";
            throw new ServiceUnavailableError(apiMessage);
        }

        const replyText = data?.candidates?.[0]?.content?.parts
            ?.map((part) => part.text)
            .filter(Boolean)
            .join("\n")
            .trim();

        if (!replyText) {
            return `${CHATBOT_REFUSAL_HINT} Bạn có thể hỏi về đặt chỗ, đăng ký xe, hoặc quy trình gửi xe.`;
        }

        return replyText;
    }

    sendMessage = async ({ message, history = [], roleName, fullName }) => {
        const reply = await this.#callGemini({ message, history, roleName, fullName });
        return {
            reply,
            model: this.#getModel(),
        };
    };

    createSession = async ({ userId, title, roleName, fullName }) => {
        this.#ensureConfigured();

        const session = await this.#chatSessionRepository.createSession({
            userId,
            title: title?.trim() || DEFAULT_SESSION_TITLE,
            model: this.#getModel(),
        });

        const welcomeMessage = await this.#chatSessionRepository.createMessage({
            sessionId: session._id,
            userId,
            role: "assistant",
            content: CHATBOT_WELCOME_MESSAGE,
        });

        const updatedSession = await this.#chatSessionRepository.updateSessionAfterMessage({
            sessionId: session._id,
            incrementBy: 1,
        });

        return {
            session: updatedSession ?? session,
            messages: [welcomeMessage],
        };
    };

    getMySessions = async ({ userId, page, limit }) => {
        return this.#chatSessionRepository.findSessionsByUserId({ userId, page, limit });
    };

    getSessionById = async ({ sessionId, userId }) => {
        const session = await this.#chatSessionRepository.findSessionById({ sessionId, userId });
        if (!session) {
            throw new NotFoundError("Chat session not found");
        }

        const messages = await this.#chatSessionRepository.findMessagesBySessionId({
            sessionId,
            userId,
        });

        return { session, messages };
    };

    sendSessionMessage = async ({
        sessionId,
        userId,
        message,
        roleName,
        fullName,
    }) => {
        const session = await this.#chatSessionRepository.findSessionById({ sessionId, userId });
        if (!session) {
            throw new NotFoundError("Chat session not found");
        }

        const trimmedMessage = message.trim();
        if (!trimmedMessage) {
            throw new BadRequestError("Message cannot be empty");
        }

        const history = await this.#chatSessionRepository.findRecentMessagesForGemini({
            sessionId,
            userId,
        });

        const reply = await this.#callGemini({
            message: trimmedMessage,
            history,
            roleName,
            fullName,
        });

        const [userMessage, assistantMessage] = await Promise.all([
            this.#chatSessionRepository.createMessage({
                sessionId,
                userId,
                role: "user",
                content: trimmedMessage,
            }),
            this.#chatSessionRepository.createMessage({
                sessionId,
                userId,
                role: "assistant",
                content: reply,
            }),
        ]);

        const shouldAutoTitle = session.title === DEFAULT_SESSION_TITLE
            && !history.some((entry) => entry.role === "user");

        const updatedSession = await this.#chatSessionRepository.updateSessionAfterMessage({
            sessionId,
            title: shouldAutoTitle ? buildAutoTitle(trimmedMessage) : undefined,
            incrementBy: 2,
        });

        return {
            session: updatedSession ?? session,
            userMessage,
            assistantMessage,
            reply,
            model: this.#getModel(),
        };
    };

    deleteSession = async ({ sessionId, userId }) => {
        const deletedSession = await this.#chatSessionRepository.deleteSession({ sessionId, userId });
        if (!deletedSession) {
            throw new NotFoundError("Chat session not found");
        }
        return deletedSession;
    };
}

export default ChatbotService;
