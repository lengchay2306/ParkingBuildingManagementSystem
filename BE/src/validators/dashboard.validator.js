import Joi from 'joi';

const getRevenueQuerySchema = Joi.object({
    year: Joi.number().integer().min(2000).max(2100).optional(),
    month: Joi.number().integer().min(1).max(12).optional(),
    day: Joi.number().integer().min(1).max(31).optional(),
    groupBy: Joi.string().valid('day', 'month').optional(),
    status: Joi.string().valid('PENDING', 'PAID', 'CANCELLED').default('PAID'),
});

export {
    getRevenueQuerySchema,
};
