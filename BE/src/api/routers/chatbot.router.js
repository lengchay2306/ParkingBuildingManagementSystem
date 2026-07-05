import express from "express";
import { authentication, authorizationByRole, validateData } from "../middleware/middleware.js";
import {
    chatMessageSchema,
    createChatSessionSchema,
    sessionMessageSchema,
    sessionIdParamsSchema,
    listChatSessionsQuerySchema,
} from "../../validators/chatbot.validator.js";

const router = express.Router();

const chatbotRoles = ["CUSTOMER", "STAFF", "MANAGER", "ADMIN"];

/**
 * @swagger
 * tags:
 *   name: Chatbot
 *   description: In-app AI assistant (Gemini) with persistent chat sessions
 */

/**
 * @swagger
 * /api/v1/chatbot/sessions:
 *   post:
 *     summary: Create a new chat session
 *     description: Starts a new conversation with a welcome message from the assistant.
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 120
 *                 example: "Hỏi về đặt chỗ"
 *     responses:
 *       201:
 *         description: Chat session created
 *       503:
 *         description: Chatbot not configured
 */
router.post(
    "/sessions",
    authentication,
    authorizationByRole(chatbotRoles),
    validateData(createChatSessionSchema),
    async (req, res, next) => {
        const chatbotController = req.container.resolve("chatbotController");
        await chatbotController.createSession(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/chatbot/sessions:
 *   get:
 *     summary: List my chat sessions
 *     description: Returns chat sessions sorted by most recent activity.
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Chat sessions fetched
 */
router.get(
    "/sessions",
    authentication,
    authorizationByRole(chatbotRoles),
    validateData(listChatSessionsQuerySchema, "query"),
    async (req, res, next) => {
        const chatbotController = req.container.resolve("chatbotController");
        await chatbotController.getMySessions(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/chatbot/sessions/{sessionId}:
 *   get:
 *     summary: Get a chat session with full message history
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session and messages returned
 *       404:
 *         description: Session not found
 */
router.get(
    "/sessions/:sessionId",
    authentication,
    authorizationByRole(chatbotRoles),
    validateData(sessionIdParamsSchema, "params"),
    async (req, res, next) => {
        const chatbotController = req.container.resolve("chatbotController");
        await chatbotController.getSessionById(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/chatbot/sessions/{sessionId}/messages:
 *   post:
 *     summary: Send a message in a chat session
 *     description: |
 *       Persists user message and assistant reply to the session.
 *       Loads prior messages from DB for Gemini context (last 20 turns).
 *       Auto-titles session from first user message.
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Message sent and reply saved
 *       404:
 *         description: Session not found
 */
router.post(
    "/sessions/:sessionId/messages",
    authentication,
    authorizationByRole(chatbotRoles),
    validateData(sessionIdParamsSchema, "params"),
    validateData(sessionMessageSchema),
    async (req, res, next) => {
        const chatbotController = req.container.resolve("chatbotController");
        await chatbotController.sendSessionMessage(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/chatbot/sessions/{sessionId}:
 *   delete:
 *     summary: Delete a chat session and all its messages
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session deleted
 *       404:
 *         description: Session not found
 */
router.delete(
    "/sessions/:sessionId",
    authentication,
    authorizationByRole(chatbotRoles),
    validateData(sessionIdParamsSchema, "params"),
    async (req, res, next) => {
        const chatbotController = req.container.resolve("chatbotController");
        await chatbotController.deleteSession(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/chatbot/message:
 *   post:
 *     summary: Send a stateless message (no session persistence)
 *     description: |
 *       Legacy/stateless endpoint. Client must send history manually.
 *       Prefer POST /chatbot/sessions and POST /chatbot/sessions/{sessionId}/messages for persistent chats.
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 */
router.post(
    "/message",
    authentication,
    authorizationByRole(chatbotRoles),
    validateData(chatMessageSchema),
    async (req, res, next) => {
        const chatbotController = req.container.resolve("chatbotController");
        await chatbotController.sendMessage(req, res, next);
    },
);

export default router;
