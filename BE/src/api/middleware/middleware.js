import { UAParser } from "ua-parser-js";
import { 
    AuthenticationError, 
    BadRequestError, 
    ForbiddenError 
} from "../../error/error.js";

export const authentication = async (req, res, next) => {
    //get access token
    const accessToken = req.cookies.accessToken

    //verify accesstoken
    if (!accessToken) {
        throw new AuthenticationError(`Token Expired or does not exist!`);
    }

    //decode
    const tokenService = req.container.resolve('tokenService');

    const decode = await tokenService.verifyAccessToken({
        token: accessToken,
    })
    if (!decode) {
        throw new AuthenticationError(`Cannot authentication cause token expired or does not exist`)
    }

    req.user = decode;

    next();
}

export const authorizationByRole = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.roleName)) {
        throw new ForbiddenError();
    }
    next();
}

export const getUserDeviceName = (req, res, next) => {
    const ua = req.headers['user-agent'];

    const parser = new UAParser(ua)
    const result = parser.getResult();

    const browser = `${result.browser.name || "Unknown browser"}-${result.browser.version || "Unknown browser version"}`;
    const os = `${result.os.name || "Unknown os"}-${result.os.version || "Unknown OS version"}`

    const device = result.device;

    if (device && (device.type === 'tablet' || device.type === 'mobile')) {
        const vendor = device.vendor || '';
        const model = device.model || '';

        req.device = `${vendor}:${model}:${browser}:${os}`
    }

    req.device = `${browser}:${os}`

    next();
}

export const handleError = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "server error";
    const status = statusCode !== 500 ? 'error' : 'fail';

    res.status(statusCode).json({
        status: status,
        message: message,
    });
}

export const validateData = (schema, property = "body") => 
                            (req, res, next) => {
    const dataToValidate = req[property];

    if (!dataToValidate) {
        throw new BadRequestError(`Mising ${property} in request `)
    }

    const { error } = schema.validate(dataToValidate);

    if (error) {
        const errorMessage = error.details[0].message;
        throw new BadRequestError(errorMessage)
    }

    next();
}