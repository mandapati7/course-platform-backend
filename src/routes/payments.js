const express = require('express');
const {
  processStripePayment,
  processPayPalPayment,
  getPaymentHistory,
  getPaymentDetails
} = require('../controllers/payments');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/stripe', protect, processStripePayment);
router.post('/paypal', protect, processPayPalPayment);
router.get('/history', protect, getPaymentHistory);
router.get('/:id', protect, getPaymentDetails);

module.exports = router;
