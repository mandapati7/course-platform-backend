const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  testConnection
} = require('../controllers/auth');

const router = express.Router();
const logger = require('../utils/logger');

// Route logging middleware
router.use((req, res, next) => {
  logger.security(`Auth route accessed: ${req.method} ${req.path}`, {
    userId: req.user ? req.user.id : 'unauthenticated',
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
  });
  next();
});

const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/test', testConnection);

module.exports = router;
