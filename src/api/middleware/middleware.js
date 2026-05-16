export const handleError = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "server error";
    const status = statusCode !== 500 ? 'error' : 'fail';

    res.status(statusCode).json({
        status: status,
        message: message,
    });
}