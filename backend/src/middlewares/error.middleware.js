import ApiError from '../utils/ApiError.js';

export const errorHandler = (err, req, res, next) => {
  console.error('[Error Middleware]:', err);
  let { statusCode, message } = err;
  
  if (!err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    error: err.message,
    stack: err.stack,
  };

  res.status(statusCode || 500).send(response);
};
