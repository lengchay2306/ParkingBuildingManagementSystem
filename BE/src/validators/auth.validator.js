import Joi from 'joi'

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
})

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().min(2).max(30).required(),
    phone: Joi.string().max(10).required(),
})

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
})
const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
})

export {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
}