import Joi from "joi";
import mongoose from "mongoose";

const validateMongoObjectId = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message(`Wrong format ID of mongoDB objectId`)
    }

    return value
}

const licensePlateSchema = Joi.string()
    .pattern(/^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/)
    .messages({
        'string.pattern.base': 'License plate must follow format: 51A-123.45',
    });

const getPricePoliciesSchema = Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().max(10).optional(),
    vehicleTypeId: Joi.string().optional(),
});

const createSubcriptionPaymentLinkSchema = Joi.object({
    vehicleId: Joi.string().custom(validateMongoObjectId).required()
})
const qrPaymentLinkSchema = Joi.object({
    parkingSessionId: Joi.string().custom(validateMongoObjectId).required()
})

const checkPaymentSchema = Joi.object({
    orderCode: Joi.number().required(),
})

const getAllPaymentsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid('PENDING', 'PAID', 'CANCELLED').optional(),
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'TRANSFER').optional(),
    orderCode: Joi.number().integer().optional(),
    vehicleId: Joi.string().custom(validateMongoObjectId).optional(),
    parkingSessionId: Joi.string().custom(validateMongoObjectId).optional(),
    licensePlate: licensePlateSchema.optional(),
    sortBy: Joi.string().valid('createdAt', 'amount', 'orderCode', 'status').optional(),
    sortOrder: Joi.alternatives().try(
        Joi.string().valid('asc', 'desc'),
        Joi.number().valid(1, -1),
    ).optional(),
})

const getPaymentsByLicensePlateParamsSchema = Joi.object({
    licensePlate: licensePlateSchema.required()
        .messages({
            'any.required': 'License plate is required',
        }),
})

const getPaymentsByLicensePlateQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid('PENDING', 'PAID', 'CANCELLED').optional(),
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'TRANSFER').optional(),
    sortBy: Joi.string().valid('createdAt', 'amount', 'orderCode', 'status').optional(),
    sortOrder: Joi.alternatives().try(
        Joi.string().valid('asc', 'desc'),
        Joi.number().valid(1, -1),
    ).optional(),
})

const paymentIdParamSchema = Joi.object({
    paymentId: Joi.string().custom(validateMongoObjectId).required(),
})

export {
    getPricePoliciesSchema,
    createSubcriptionPaymentLinkSchema,
    qrPaymentLinkSchema,
    checkPaymentSchema,
    getAllPaymentsQuerySchema,
    getPaymentsByLicensePlateParamsSchema,
    getPaymentsByLicensePlateQuerySchema,
    paymentIdParamSchema,
}
