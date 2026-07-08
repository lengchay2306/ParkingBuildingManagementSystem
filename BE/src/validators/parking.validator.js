import Joi from "joi";
import mongoose from "mongoose";

const validateMongoObjectId = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message('Wrong format ID of mongoDB objectId')
    }

    return value
}

const queryParkingSessionsSchema = Joi.object({
    page: Joi.number(),
    limit: Joi.number(),
    status: Joi.string().valid("ACTIVE", "COMPLETED"),
    date: Joi.date(),
})

const parkingSessionSchema = Joi.object({
    phone: Joi.string()
                .pattern(/^(03|05|07|08|09)\d{8}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Wrong phone format',
                }),
    licensePlate: Joi.string().required(),
    // parkingSlotId: Joi.string()
    //                     .custom(validateMongoObjectId)
    //                     .required(),
});

const guestParkingSessionSchema = Joi.object({
    phone: Joi.string()
                .pattern(/^(03|05|07|08|09)\d{8}$/)
                .messages({
                    'string.pattern.base': 'Wrong phone format',
                }),
    licensePlate: Joi.string().required(),
    parkingSlotId: Joi.string()
                        .custom(validateMongoObjectId)
                        .required(),
    vehicleTypeId: Joi.string()
                    .custom(validateMongoObjectId),
});

const checkParkingSessionSchema = Joi.object({
    phone: Joi.string()
                .pattern(/^(03|05|07|08|09)\d{8}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Wrong phone format'
                }),
});

export {
    parkingSessionSchema,
    guestParkingSessionSchema,
    checkParkingSessionSchema,
    queryParkingSessionsSchema,
}
