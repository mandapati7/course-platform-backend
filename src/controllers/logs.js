// filepath: c:\Study\course-platform-backend\src\controllers\logs.js
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const ClientLog = require('../models/ClientLog');
const logger = require('../utils/logger');

// @desc    Store client-side logs
// @route   POST /api/v1/client-logs
// @access  Public (but can track authenticated users)
exports.storeClientLogs = asyncHandler(async (req, res, next) => {
  const { sessionId, deviceInfo, logs } = req.body;
  
  // Validate required fields
  if (!sessionId || !deviceInfo || !logs || !Array.isArray(logs)) {
    return next(new ErrorResponse('Please provide valid sessionId, deviceInfo, and logs array', 400));
  }

  // Check if logs array is empty
  if (logs.length === 0) {
    return next(new ErrorResponse('Logs array cannot be empty', 400));
  }

  try {
    // Create a log document
    const clientLog = await ClientLog.create({
      sessionId,
      userId: req.user ? req.user.id : undefined,  // Include user ID if authenticated
      deviceInfo,
      logs
    });

    // For high volume production, you might want to add this
    // to a message queue instead of direct DB writes
    
    // Log a summary to server logs
    logger.info(`Received ${logs.length} client logs for session ${sessionId}`, {
      category: 'CLIENT_LOGS',
      sessionId,
      userId: req.user ? req.user.id : 'unauthenticated',
      logCount: logs.length
    });

    // Return success
    res.status(201).json({
      success: true,
      data: {
        id: clientLog._id,
        logCount: logs.length
      }
    });
  } catch (err) {
    logger.error(`Failed to store client logs: ${err.message}`, {
      category: 'ERROR',
      error: err.message
    });
    
    // Don't let log storage failures block the client
    // Just acknowledge receipt even if storage failed
    res.status(202).json({
      success: false,
      message: 'Logs received but could not be stored'
    });
  }
});

// @desc    Get client logs by session ID
// @route   GET /api/v1/client-logs/:sessionId
// @access  Private/Admin
exports.getClientLogsBySession = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return next(new ErrorResponse('Please provide a session ID', 400));
  }

  const clientLogs = await ClientLog.find({ sessionId });

  res.status(200).json({
    success: true,
    count: clientLogs.length,
    data: clientLogs
  });
});

// @desc    Get client logs by user ID
// @route   GET /api/v1/client-logs/user/:userId
// @access  Private/Admin
exports.getClientLogsByUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new ErrorResponse('Please provide a user ID', 400));
  }

  const clientLogs = await ClientLog.find({ userId });

  res.status(200).json({
    success: true,
    count: clientLogs.length,
    data: clientLogs
  });
});