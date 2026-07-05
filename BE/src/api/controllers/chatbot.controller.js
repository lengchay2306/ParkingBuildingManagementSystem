class ChatbotController {
    #chatbotService;

    constructor({ chatbotService }) {
        this.#chatbotService = chatbotService;
    }

    sendMessage = async (req, res, next) => {
        try {
            const { message, history } = req.body;
            const { roleName, fullName } = req.user;

            const result = await this.#chatbotService.sendMessage({
                message,
                history,
                roleName,
                fullName,
            });

            res.status(200).json({
                status: "success",
                data: {
                    reply: result.reply,
                    model: result.model,
                },
                message: "Chat response generated successfully",
            });
        } catch (error) {
            next(error);
        }
    };

    createSession = async (req, res, next) => {
        try {
            const { userId, roleName, fullName } = req.user;
            const { title } = req.body;

            const result = await this.#chatbotService.createSession({
                userId,
                title,
                roleName,
                fullName,
            });

            res.status(201).json({
                status: "success",
                data: result,
                message: "Chat session created successfully",
            });
        } catch (error) {
            next(error);
        }
    };

    getMySessions = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { page, limit } = req.query;

            const result = await this.#chatbotService.getMySessions({
                userId,
                page: Number(page) || 1,
                limit: Number(limit) || 20,
            });

            res.status(200).json({
                status: "success",
                data: result,
                message: "Chat sessions fetched successfully",
            });
        } catch (error) {
            next(error);
        }
    };

    getSessionById = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { sessionId } = req.params;

            const result = await this.#chatbotService.getSessionById({
                sessionId,
                userId,
            });

            res.status(200).json({
                status: "success",
                data: result,
                message: "Chat session fetched successfully",
            });
        } catch (error) {
            next(error);
        }
    };

    sendSessionMessage = async (req, res, next) => {
        try {
            const { userId, roleName, fullName } = req.user;
            const { sessionId } = req.params;
            const { message } = req.body;

            const result = await this.#chatbotService.sendSessionMessage({
                sessionId,
                userId,
                message,
                roleName,
                fullName,
            });

            res.status(200).json({
                status: "success",
                data: result,
                message: "Chat response generated successfully",
            });
        } catch (error) {
            next(error);
        }
    };

    deleteSession = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { sessionId } = req.params;

            const deletedSession = await this.#chatbotService.deleteSession({
                sessionId,
                userId,
            });

            res.status(200).json({
                status: "success",
                data: { session: deletedSession },
                message: "Chat session deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    };
}

export default ChatbotController;
