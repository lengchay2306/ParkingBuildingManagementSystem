import Joi from 'joi'

const licensePlateSchema = Joi.string()
    .pattern(/^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/)
    .messages({
        'string.pattern.base': 'License plate must follow format: 51A-123.45',
    })

const objectIdSchema = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'must be a valid ObjectId',
})

const createUserVehicleItemSchema = Joi.object({
    licensePlate: licensePlateSchema.required(),
    vehicleTypeId: objectIdSchema.required(),
    monthlyCardId: objectIdSchema.allow(null).optional(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
})

const updateUserVehicleItemSchema = Joi.object({
    action: Joi.string().valid('create', 'update', 'delete').required(),
    vehicleId: objectIdSchema.when('action', {
        is: Joi.valid('update', 'delete'),
        then: Joi.required(),
        otherwise: Joi.forbidden(),
    }),
    licensePlate: licensePlateSchema.when('action', {
        is: 'create',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
    vehicleTypeId: objectIdSchema.when('action', {
        is: 'create',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
    monthlyCardId: objectIdSchema.allow(null).optional(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
})

const updateMyProfileSchema = Joi.object({
    email: Joi.string().email().optional(),
    fullName: Joi.string().min(2).max(30).optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional().messages({
        'string.pattern.base': 'Phone number must be exactly 10 digits',
    }),
}).min(1).messages({
    'object.min': 'At least one field (email, fullName or phone) must be provided',
})

const createUserSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().min(2).max(30).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
        'string.pattern.base': 'Phone number must be exactly 10 digits',
    }),
    roleId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
        'string.pattern.base': 'roleId must be a valid ObjectId',
    }),
    status: Joi.string().valid('ACTIVE', 'LOCKED').optional(),
    vehicles: Joi.array().items(createUserVehicleItemSchema).optional(),
})

const updateUserByIdSchema = Joi.object({
    email: Joi.string().email().optional(),
    password: Joi.string().min(8).optional(),
    fullName: Joi.string().min(2).max(30).optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional().messages({
        'string.pattern.base': 'Phone number must be exactly 10 digits',
    }),
    status: Joi.string().valid('ACTIVE', 'LOCKED').optional(),
    roleId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional().messages({
        'string.pattern.base': 'roleId must be a valid ObjectId',
    }),
    vehicles: Joi.array().items(updateUserVehicleItemSchema).optional(),
}).custom((value, helpers) => {
    const { vehicles, ...userFields } = value;
    const hasUserField = Object.keys(userFields).length > 0;
    const hasVehicles = Array.isArray(vehicles) && vehicles.length > 0;

    if (!hasUserField && !hasVehicles) {
        return helpers.error('object.min');
    }

    return value;
}).messages({
    'object.min': 'At least one field must be provided',
})

const userIdParamSchema = Joi.object({
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
        'string.pattern.base': 'userId must be a valid ObjectId',
    }),
})

const changePasswordSchema = Joi.object({
    oldPassword: Joi.string().min(8).required(),
    newPassword: Joi.string()
        .min(8)
        .invalid(Joi.ref('oldPassword'))
        .required()
        .messages({
            'any.invalid': 'New password must be different from old password',
        }),
})

export {
    updateMyProfileSchema,
    createUserSchema,
    updateUserByIdSchema,
    userIdParamSchema,
    changePasswordSchema,
}
