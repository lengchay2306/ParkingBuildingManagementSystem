import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, "ObjectId");

const chatHistoryEntrySchema = Joi.object({
    role: Joi.string().valid("user", "assistant").required(),
    content: Joi.string().trim().min(1).max(4000).required(),
});

const chatMessageSchema = Joi.object({
    message: Joi.string().trim().min(1).max(2000).required()
        .messages({
            "string.empty": "Message cannot be empty",
            "any.required": "Message is required",
        }),
    history: Joi.array()
        .items(chatHistoryEntrySchema)
        .max(20)
        .default([]),
});

const createChatSessionSchema = Joi.object({
    title: Joi.string().trim().min(1).max(120).optional(),
});

const sessionMessageSchema = Joi.object({
    message: Joi.string().trim().min(1).max(2000).required()
        .messages({
            "string.empty": "Message cannot be empty",
            "any.required": "Message is required",
        }),
});

const sessionIdParamsSchema = Joi.object({
    sessionId: objectId.required()
        .messages({ "string.pattern.name": "sessionId must be a valid ObjectId" }),
});

const listChatSessionsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
});

export {
    chatMessageSchema,
    createChatSessionSchema,
    sessionMessageSchema,
    sessionIdParamsSchema,
    listChatSessionsQuerySchema,
};
