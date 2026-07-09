import Joi from 'joi';

const objectIdSchema = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'must be a valid ObjectId',
});

const createFloorSchema = Joi.object({
    floorName: Joi.string().trim().min(1).max(100).required(),
    vehicleTypeId: objectIdSchema.required(),
    totalSlot: Joi.number().integer().min(0).required(),
});

const updateFloorSchema = Joi.object({
    floorName: Joi.string().trim().min(1).max(100).optional(),
    vehicleTypeId: objectIdSchema.optional(),
    totalSlot: Joi.number().integer().min(0).optional(),
}).min(1).messages({
    'object.min': 'At least one field must be provided',
});

const floorIdParamSchema = Joi.object({
    floorId: objectIdSchema.required(),
});

const getFloorsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    vehicleTypeId: objectIdSchema.optional(),
});

export {
    createFloorSchema,
    updateFloorSchema,
    floorIdParamSchema,
    getFloorsQuerySchema,
};
