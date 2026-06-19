import { BadRequestError, ConflictError } from "../error/error.js";

const DUPLICATE_KEY_MESSAGES = {
    email: "Email already in use",
    phone: "Phone number already in use",
    licensePlate: "License plate already exists",
};

export const mapMongooseError = (error) => {
    if (!error || error.statusCode) {
        return error;
    }

    if (error.name === "CastError") {
        if (error.kind === "ObjectId") {
            return new BadRequestError("Invalid ID format");
        }
        return new BadRequestError("Invalid data format");
    }

    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern ?? error.keyValue ?? {})[0];
        const message = DUPLICATE_KEY_MESSAGES[field] ?? `${field ?? "Field"} already in use`;
        return new ConflictError(message);
    }

    if (error.name === "ValidationError") {
        const message = Object.values(error.errors)
            .map((item) => item.message)
            .join(", ");
        return new BadRequestError(message || "Validation failed");
    }

    return error;
};
