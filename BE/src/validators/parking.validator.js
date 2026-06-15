import Joi from "joi";
import mongoose from "mongoose";

const validateMongoObjectId = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message('Wrong format ID of mongoDB objectId')
    }

    return value
}

const parkingSessionSchema = Joi.object({
    phone: Joi.string()
                .pattern(/^(03|05|07|08|09)\d{8}$/)
                .required()
                .message(
                    'string.pattern.base: Wrong phone format'
                ),
    licensePlate: Joi.string().required(),
    parkingSlotId: Joi.string()
                        .custom(validateMongoObjectId)
                        .required(),
});
