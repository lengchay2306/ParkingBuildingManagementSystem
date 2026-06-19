import Joi from 'joi'

const updateMyProfileSchema = Joi.object({
    fullName: Joi.string().min(2).max(30).optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional().messages({
        'string.pattern.base': 'Phone number must be exactly 10 digits',
    }),
}).min(1).messages({
    'object.min': 'At least one field (fullName or phone) must be provided',
})

const updateUserByIdSchema = Joi.object({
    email: Joi.string().email().optional(),
    fullName: Joi.string().min(2).max(30).optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional().messages({
        'string.pattern.base': 'Phone number must be exactly 10 digits',
    }),
    status: Joi.string().valid('ACTIVE', 'LOCKED').optional(),
    roleId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional().messages({
        'string.pattern.base': 'roleId must be a valid ObjectId',
    }),
}).min(1).messages({
    'object.min': 'At least one field must be provided',
})

export {
    updateMyProfileSchema,
    updateUserByIdSchema,
}
