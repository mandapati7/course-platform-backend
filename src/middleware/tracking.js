const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Middleware to track user journeys by adding request IDs,
 * maintaining session IDs, and identifying users
 */
const trackRequest = (req, res, next) => {
  // Generate a unique request ID for this request
  req.requestId = uuidv4();
  
  // Check if frontend provided a tracking ID (from mobile app or web client)
  let sessionId = req.headers['x-session-id'] || null;
  
  // If no session ID provided, check for existing cookie or create new one
  if (!sessionId) {
    sessionId = req.cookies?.sessionId || uuidv4();
    
    // Set cookie if it doesn't exist (30 days expiry, same as JWT)
    if (!req.cookies?.sessionId) {
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    }
  }
  
  // Store session ID on request object
  req.sessionId = sessionId;
  
  // Add tracking IDs to response headers for frontend to use
  res.setHeader('X-Request-ID', req.requestId);
  res.setHeader('X-Session-ID', sessionId);
  
  // Create initial user context (will be updated at response time)
  req.userContext = {
    sessionId,
    requestId: req.requestId,
    clientIp: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  // Get JWT token from request (if any) for logging - Fix the undefined error
  let token = null;
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Log start of request with tracking information
  logger.info(`Request started: ${req.method} ${req.originalUrl}`, {
    category: 'API',
    tracking: {
      ...req.userContext,
      // Initial userId will be from token if available, but will be updated in response
      userId: req.user?.id || 'unauthenticated',
      userRole: req.user?.role || 'guest',
      hasAuthToken: !!token
    },
    timestamp: new Date().toISOString()
  });
  
  // Store request start time for response time calculation
  req._startTime = Date.now();
  
  // Track response completion with updated user information
  const originalEnd = res.end;
  res.end = function() {
    // Before ending the response, get the latest user info
    // By this point, auth middleware will have populated req.user if the user is authenticated
    const userId = req.user?.id || 'unauthenticated';
    const userRole = req.user?.role || 'guest';
    
    // Update user context with final values
    const finalUserContext = {
      ...req.userContext,
      userId,
      userRole,
      statusCode: res.statusCode,
      responseTime: Date.now() - req._startTime
    };
    
    // Call original end method
    originalEnd.apply(res, arguments);
    
    // Log request completion with full user context
    logger.info(`Request completed: ${req.method} ${req.originalUrl}`, {
      category: 'API',
      tracking: finalUserContext,
      timestamp: new Date().toISOString()
    });
  };
  
  next();
};

module.exports = trackRequest;