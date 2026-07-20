import Joi from 'joi'

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'ObjectId')

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/** expectedArrival must be in the future and within the next 2 hours. */
const expectedArrivalWithinTwoHours = Joi.date()
    .iso()
    .greater('now')
    .required()
    .custom((value, helpers) => {
        const maxArrival = new Date(Date.now() + TWO_HOURS_MS);
        if (value.getTime() > maxArrival.getTime()) {
            return helpers.message('expectedArrival must be within 2 hours from now');
        }
        return value;
    })
    .messages({
        'date.greater': 'expectedArrival must be a future date',
    });

const createReservationSchema = Joi.object({
    vehicleId: objectId.required()
        .messages({ 'string.pattern.name': 'vehicleId must be a valid ObjectId' }),
    parkingSlotId: objectId.required()
        .messages({ 'string.pattern.name': 'parkingSlotId must be a valid ObjectId' }),
    expectedArrival: expectedArrivalWithinTwoHours,
    platform: Joi.string().valid('web', 'mobile').default('web'),
})

const cancelReservationSchema = Joi.object({
    reservationId: objectId.required()
        .messages({ 'string.pattern.name': 'reservationId must be a valid ObjectId' }),
})

const reservationStatus = Joi.string().valid('PENDING', 'CLAIMED', 'EXPIRED', 'CANCELLED');

const getMyReservationsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: reservationStatus.optional(),
});

const getReservationsByVehiclePlateParamsSchema = Joi.object({
    licensePlate: Joi.string()
        .pattern(/^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/)
        .required()
        .messages({
            'string.pattern.base': 'License plate must follow format: 51A-123.45',
            'any.required': 'License plate is required',
        }),
});

const getReservationsByVehiclePlateQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: reservationStatus.optional(),
});

const recommendSlotsSchema = Joi.object({
    vehicleId: objectId.required()
        .messages({ 'string.pattern.name': 'vehicleId must be a valid ObjectId' }),
    expectedArrival: expectedArrivalWithinTwoHours,
    limit: Joi.number().integer().min(1).max(10).default(3),
});

export {
    createReservationSchema,
    cancelReservationSchema,
    getMyReservationsQuerySchema,
    getReservationsByVehiclePlateParamsSchema,
    getReservationsByVehiclePlateQuerySchema,
    recommendSlotsSchema,
}
