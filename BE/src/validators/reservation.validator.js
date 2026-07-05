import Joi from 'joi'

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'ObjectId')

const createReservationSchema = Joi.object({
    vehicleId: objectId.required()
        .messages({ 'string.pattern.name': 'vehicleId must be a valid ObjectId' }),
    parkingSlotId: objectId.required()
        .messages({ 'string.pattern.name': 'parkingSlotId must be a valid ObjectId' }),
    expectedArrival: Joi.date().iso().greater('now').required()
        .messages({ 'date.greater': 'expectedArrival must be a future date' }),
})

const cancelReservationSchema = Joi.object({
    reservationId: objectId.required()
        .messages({ 'string.pattern.name': 'reservationId must be a valid ObjectId' }),
})

const reservationStatus = Joi.string().valid('PENDING', 'CLAIMED', 'EXPIRED', 'CANCELLED');

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
    status: reservationStatus.optional(),
});

export {
    createReservationSchema,
    cancelReservationSchema,
    getReservationsByVehiclePlateParamsSchema,
    getReservationsByVehiclePlateQuerySchema,
}
