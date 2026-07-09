import Joi from 'joi';

const objectIdSchema = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'must be a valid ObjectId',
});

const createPricePolicySchema = Joi.object({
    vehicleTypeId: objectIdSchema.required(),
    policyName: Joi.string().trim().min(2).max(100).required(),
    fromHour: Joi.number().min(0).required(),
    toHour: Joi.number().min(0).required(),
    ratePerHour: Joi.number().positive().required(),
    monthlyRate: Joi.number().positive().allow(null).optional(),
});

const updatePricePolicySchema = Joi.object({
    vehicleTypeId: objectIdSchema.optional(),
    policyName: Joi.string().trim().min(2).max(100).optional(),
    fromHour: Joi.number().min(0).optional(),
    toHour: Joi.number().min(0).optional(),
    ratePerHour: Joi.number().positive().optional(),
    monthlyRate: Joi.number().positive().allow(null).optional(),
}).min(1).messages({
    'object.min': 'At least one field must be provided',
});

const pricePolicyIdParamSchema = Joi.object({
    pricePolicyId: objectIdSchema.required(),
});

const getPricePoliciesQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    vehicleTypeId: objectIdSchema.optional(),
});

export {
    createPricePolicySchema,
    updatePricePolicySchema,
    pricePolicyIdParamSchema,
    getPricePoliciesQuerySchema,
};
