import Joi from 'joi'

const updateMyProfileSchema = Joi.object({
    fullName: Joi.string().min(2).max(30).optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional().messages({
        'string.pattern.base': 'Phone number must be exactly 10 digits',
    }),
}).min(1).messages({
    'object.min': 'At least one field (fullName or phone) must be provided',
})

export {
    updateMyProfileSchema,
}
