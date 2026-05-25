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

export {
    createReservationSchema,
    cancelReservationSchema,
}
