const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Get most up-to-date tracking info for error logs
  // By this point auth middleware should have added user info if authenticated
  const tracking = {
    userId: req.user?.id || 'unauthenticated',
    sessionId: req.sessionId || 'unknown',
    requestId: req.requestId || 'unknown',
    userRole: req.user?.role || 'guest',
    clientIp: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || 'unknown'
  };

  // Log the error with tracking information
  logger.error(`Error: ${err.message}`, { tracking });
  logger.debug(`Error stack: ${err.stack}`, { tracking });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  // Version error
  if (err.name === 'VersionError') {
    logger.error('MongoDB version conflict:', { ...err, tracking });
    error = new ErrorResponse('Data conflict occurred. Please try again.', 409);
  }

  // Include tracking IDs in error response for correlation
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    requestId: req.requestId || 'unknown',
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
