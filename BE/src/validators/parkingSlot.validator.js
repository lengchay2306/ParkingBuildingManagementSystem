import Joi from 'joi';

const objectIdSchema = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'must be a valid ObjectId',
});

const slotStatusSchema = Joi.string().valid(
    'AVAILABLE',
    'RESERVED',
    'UNAVAILABLE',
    'CURRENTLY-IN-USED',
);

const createParkingSlotSchema = Joi.object({
    floorId: objectIdSchema.required(),
    slotNumber: Joi.string().trim().min(1).max(50).required(),
    status: slotStatusSchema.required(),
});

const updateParkingSlotSchema = Joi.object({
    floorId: objectIdSchema.optional(),
    slotNumber: Joi.string().trim().min(1).max(50).optional(),
    status: slotStatusSchema.optional(),
}).min(1).messages({
    'object.min': 'At least one field must be provided',
});

const parkingSlotIdParamSchema = Joi.object({
    parkingSlotId: objectIdSchema.required(),
});

const getParkingSlotsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    floorId: objectIdSchema.optional(),
    status: slotStatusSchema.optional(),
});

export {
    createParkingSlotSchema,
    updateParkingSlotSchema,
    parkingSlotIdParamSchema,
    getParkingSlotsQuerySchema,
};
