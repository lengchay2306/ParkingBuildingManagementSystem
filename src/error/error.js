class ApiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

export class BadRequestError extends ApiError {
    constructor(message = "Bad request") {
        super(message, 400);
    }
}
export class ConflictError extends ApiError {
    constructor(message = "Conflict") {
        super(message, 409);
    }
}
export class NotFoundError extends ApiError {
    constructor(message = "Not Found") {
        super(message, 404);
    }
}
export class AuthorizationError extends ApiError {
    constructor(message = "Authorization header is missing") {
        super(message, 401);
    }
}
export class TokenMissing extends ApiError {
    constructor(message = "Token is missing from Authorization header") {
        super(message, 401);
    }
}
export class ForbiddenError extends ApiError {
    constructor(message = "You do not have permission") {
        super(message, 403);
    }
}
export class AuthenticationError extends ApiError {
    constructor(message = "Authentication failed") {
        super(message, 401);
    }
}
