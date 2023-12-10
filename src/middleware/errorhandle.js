class CustomError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

const errorHandler = (err, req, res, next) => {
    console.error(err); // Log the error for debugging purposes

    // Check if the error is a known error type
    if (err instanceof CustomError) {
        return res.status(err.statusCode).send({ error: err.message, request_status: 'failed' });
    }

    // Handle other types of errors
    return res.status(500).send({ error: 'Internal Server Error', detail: err, request_status: 'failed' });
};

module.exports = {
    errorHandler,
    CustomError
}