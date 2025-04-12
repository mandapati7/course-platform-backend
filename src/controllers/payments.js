const Payment = require('../models/Payment');
const Course = require('../models/Course');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// Initialize Stripe only if secret key is available
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// @desc    Process payment with Stripe
// @route   POST /api/v1/payments/stripe
// @access  Private
exports.processStripePayment = asyncHandler(async (req, res, next) => {
  const { courseId, paymentMethodId } = req.body;

  // Find course
  const course = await Course.findById(courseId);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${courseId}`, 404)
    );
  }

  // Check if user is already enrolled
  const user = await User.findById(req.user.id);
  const alreadyEnrolled = user.enrolledCourses && user.enrolledCourses.some(
    enrolledCourse => enrolledCourse.course.toString() === courseId
  );

  if (alreadyEnrolled) {
    return next(
      new ErrorResponse(`Already enrolled in course ${courseId}`, 400)
    );
  }

  try {
    let paymentStatus = 'pending';
    let paymentIntentId = 'test_payment_id';

    if (process.env.NODE_ENV !== 'test') {
      if (!stripe) {
        return next(new ErrorResponse('Stripe payments are not configured', 501));
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(course.price * 100),
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        description: `Enrollment in course: ${course.title}`,
        metadata: {
          courseId,
          userId: req.user.id
        }
      });

      paymentStatus = paymentIntent.status === 'succeeded' ? 'completed' : 'pending';
      paymentIntentId = paymentIntent.id;
    } else {
      // In test mode, always simulate successful payment
      paymentStatus = 'completed';
    }

    // Create payment record
    const payment = await Payment.create({
      user: req.user.id,
      course: courseId,
      amount: course.price,
      paymentMethod: 'credit_card',
      paymentId: paymentIntentId,
      status: paymentStatus,
      transactionDetails: { id: paymentIntentId }
    });

    // If payment succeeded, enroll user in course
    if (paymentStatus === 'completed') {
      // Initialize enrolledCourses array if it doesn't exist
      if (!user.enrolledCourses) {
        user.enrolledCourses = [];
      }

      // Add course to user's enrolled courses
      user.enrolledCourses.push({
        course: courseId,
        enrolledAt: Date.now(),
        progress: 0,
        completed: false,
        completedLessons: []
      });

      await user.save();

      // Increment course enrollment count
      course.totalEnrollments = (course.totalEnrollments || 0) + 1;
      await course.save();

      // Create notification
      await Notification.create({
        user: req.user.id,
        type: 'payment',
        title: 'Course Enrollment Successful',
        message: 'Payment successful',
        details: `You have successfully enrolled in ${course.title}`,
        actionLink: `/courses/${courseId}`,
        actionText: 'Start Learning'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        paymentId: payment._id,
        status: payment.status
      }
    });
  } catch (error) {
    return next(
      new ErrorResponse(`Payment failed: ${error.message}`, 400)
    );
  }
});

// @desc    Process payment with PayPal
// @route   POST /api/v1/payments/paypal
// @access  Private
exports.processPayPalPayment = asyncHandler(async (req, res, next) => {
  const { courseId, paypalOrderId } = req.body;

  // Find course
  const course = await Course.findById(courseId);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${courseId}`, 404)
    );
  }

  // Check if user is already enrolled
  const user = await User.findById(req.user.id);
  const alreadyEnrolled = user.enrolledCourses && user.enrolledCourses.some(
    enrolledCourse => enrolledCourse.course.toString() === courseId
  );

  if (alreadyEnrolled) {
    return next(
      new ErrorResponse(`Already enrolled in course ${courseId}`, 400)
    );
  }

  // In a real implementation, we would verify the PayPal order here
  // For this example, we'll assume the payment was successful

  // Create payment record
  const payment = await Payment.create({
    user: req.user.id,
    course: courseId,
    amount: course.price,
    paymentMethod: 'paypal',
    paymentId: paypalOrderId,
    status: 'completed',
    transactionDetails: { orderId: paypalOrderId }
  });

  // Initialize enrolledCourses array if it doesn't exist
  if (!user.enrolledCourses) {
    user.enrolledCourses = [];
  }

  // Add course to user's enrolled courses
  user.enrolledCourses.push({
    course: courseId,
    enrolledAt: Date.now(),
    progress: 0,
    completed: false,
    completedLessons: []
  });

  await user.save();

  // Increment course enrollment count
  course.totalEnrollments = (course.totalEnrollments || 0) + 1;
  await course.save();

  // Create notification
  await Notification.create({
    user: req.user.id,
    type: 'payment',
    title: 'Course Enrollment Successful',
    message: 'Payment successful',
    details: `You have successfully enrolled in ${course.title}`,
    actionLink: `/courses/${courseId}`,
    actionText: 'Start Learning'
  });

  res.status(200).json({
    success: true,
    data: {
      paymentId: payment._id,
      status: payment.status
    }
  });
});

// @desc    Get user payment history
// @route   GET /api/v1/payments/history
// @access  Private
exports.getPaymentHistory = asyncHandler(async (req, res, next) => {
  const payments = await Payment.find({ user: req.user.id })
    .populate({
      path: 'course',
      select: 'title thumbnail'
    })
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Get payment details
// @route   GET /api/v1/payments/:id
// @access  Private
exports.getPaymentDetails = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate({
      path: 'course',
      select: 'title thumbnail price'
    })
    .populate({
      path: 'user',
      select: 'name email'
    });

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the payment or is admin
  if (payment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`Not authorized to access this payment`, 403)
    );
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});
