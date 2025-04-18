// filepath: c:\Study\course-platform-backend\src\routes\logs.js
const express = require('express');
const {
  storeClientLogs,
  getClientLogsBySession,
  getClientLogsByUser
} = require('../controllers/logs');

const router = express.Router();
const logger = require('../utils/logger');

// Route logging middleware
router.use((req, res, next) => {
  logger.debug(`Logs route accessed: ${req.method} ${req.path}`, {
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
  });
  next();
});

const { protect, authorize } = require('../middleware/auth');

// Public route for storing logs
router.post('/', storeClientLogs);

// Protected routes for retrieving logs (admin only)
router.get('/:sessionId', protect, authorize('admin'), getClientLogsBySession);
router.get('/user/:userId', protect, authorize('admin'), getClientLogsByUser);

module.exports = router;