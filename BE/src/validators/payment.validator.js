import Joi from "joi";
import mongoose from "mongoose";

const validateMongoObjectId = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message(`Wrong format ID of mongoDB objectId`)
    }

    return value
}

const getPricePoliciesSchema = Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().max(10).optional(),
    vehicleTypeId: Joi.string().optional(),
});

const createSubcriptionPaymentLinkSchema = Joi.object({
    vehicleId: Joi.string().custom(validateMongoObjectId)
})

export {
    getPricePoliciesSchema,
    createSubcriptionPaymentLinkSchema,
}
