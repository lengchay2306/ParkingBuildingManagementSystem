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

export {
    loginSchema,
    registerSchema,
}