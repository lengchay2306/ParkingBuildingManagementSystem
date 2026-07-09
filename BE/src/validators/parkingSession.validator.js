import Joi from 'joi';

const objectIdSchema = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'must be a valid ObjectId',
});

const createParkingSessionSchema = Joi.object({
    vehicleId: objectIdSchema.allow(null).optional(),
    phone: Joi.string().allow(null).optional(),
    licensePlate: Joi.string().allow(null).optional(),
    parkingSlotId: objectIdSchema.required(),
    sessionType: Joi.string().valid('DAILY', 'MONTH').required(),
    checkInUserId: objectIdSchema.allow(null).optional(),
    checkOutUserId: objectIdSchema.allow(null).optional(),
    checkInStaffId: objectIdSchema.required(),
    checkOutStaffId: objectIdSchema.allow(null).optional(),
    deleteStaffId: objectIdSchema.allow(null).optional(),
    checkInTime: Joi.date().optional(),
    checkOutTime: Joi.date().allow(null).optional(),
    status: Joi.string().valid('ACTIVE', 'COMPLETED').required(),
    isGuest: Joi.boolean().optional(),
});

const updateParkingSessionSchema = Joi.object({
    vehicleId: objectIdSchema.allow(null).optional(),
    phone: Joi.string().allow(null).optional(),
    licensePlate: Joi.string().allow(null).optional(),
    parkingSlotId: objectIdSchema.optional(),
    sessionType: Joi.string().valid('DAILY', 'MONTH').optional(),
    checkInUserId: objectIdSchema.allow(null).optional(),
    checkOutUserId: objectIdSchema.allow(null).optional(),
    checkInStaffId: objectIdSchema.optional(),
    checkOutStaffId: objectIdSchema.allow(null).optional(),
    deleteStaffId: objectIdSchema.allow(null).optional(),
    checkInTime: Joi.date().optional(),
    checkOutTime: Joi.date().allow(null).optional(),
    status: Joi.string().valid('ACTIVE', 'COMPLETED').optional(),
    isGuest: Joi.boolean().optional(),
}).min(1).messages({
    'object.min': 'At least one field must be provided',
});

const parkingSessionIdParamSchema = Joi.object({
    parkingSessionId: objectIdSchema.required(),
});

const getParkingSessionsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid('ACTIVE', 'COMPLETED').optional(),
    vehicleId: objectIdSchema.optional(),
    parkingSlotId: objectIdSchema.optional(),
});

export {
    createParkingSessionSchema,
    updateParkingSessionSchema,
    parkingSessionIdParamSchema,
    getParkingSessionsQuerySchema,
};
