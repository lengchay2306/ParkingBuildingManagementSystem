import Joi from 'joi'

const createVehicleSchema = Joi.object({
    licensePlate: Joi.string()
        .pattern(/^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/)
        .required()
        .messages({
            'string.pattern.base': 'License plate must follow format: 51A-123.45',
            'any.required': 'License plate is required',
        }),
    vehicleTypeId: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'vehicleTypeId must be a valid ObjectId',
            'any.required': 'Vehicle type is required',
        }),
})

const updateVehicleSchema = Joi.object({
    licensePlate: Joi.string()
        .pattern(/^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/)
        .optional()
        .messages({
            'string.pattern.base': 'License plate must follow format: 51A-123.45',
        }),
    vehicleTypeId: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .optional()
        .messages({
            'string.pattern.base': 'vehicleTypeId must be a valid ObjectId',
        }),
}).min(1).messages({
    'object.min': 'At least one field must be provided',
})
export {
    createVehicleSchema,
    updateVehicleSchema,
}
