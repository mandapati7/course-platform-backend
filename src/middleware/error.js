const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.log('Error details:', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });

  // Handle charset error
  if (err.message && err.message.includes('unsupported charset')) {
    console.log('Handling charset error, raw body:', req.body);
    return res.status(400).json({
      success: false,
      message: 'Invalid request format. Please ensure proper JSON formatting.'
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = {};
    Object.values(err.errors).forEach(error => {
      errors[error.path] = error.message;
    });
    return res.status(422).json({
      success: false,
      errors
    });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error'
  });
};

module.exports = errorHandler;
