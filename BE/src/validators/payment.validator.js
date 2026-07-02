import Joi from "joi";

const getPricePoliciesSchema = Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().max(10).optional(),
    vehicleTypeId: Joi.string().optional(),
});

export {
    getPricePoliciesSchema,
}
