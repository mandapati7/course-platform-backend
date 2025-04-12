const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user notifications
// @route   GET /api/v1/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };
  reqQuery.user = req.user.id;

  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);

  // Handle unread filter
  if (req.query.unread) {
    reqQuery.unread = req.query.unread === 'true';
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Create base query
  let query = Notification.find(reqQuery);

  // Get total count before pagination
  const total = await Notification.countDocuments(reqQuery);

  // Add pagination to query
  query = query.skip(startIndex).limit(limit);

  // Sort by createdAt descending by default
  query = query.sort('-createdAt');

  // Execute query
  const notifications = await query;

  // Pagination result
  const pagination = {};

  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }

  if (startIndex + limit < total) {
    pagination.next = { page: page + 1, limit };
  }

  res.status(200).json({
    success: true,
    count: notifications.length,
    pagination,
    data: notifications
  });
});

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
  let notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(
      new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure notification belongs to user
  if (notification.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`Not authorized to access this notification`, 403)
    );
  }

  notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { unread: false },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: notification
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user.id, unread: true },
    { unread: false }
  );

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(
      new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure notification belongs to user
  if (notification.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`Not authorized to delete this notification`, 403)
    );
  }

  await notification.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Create notification (admin only)
// @route   POST /api/v1/notifications
// @access  Private (Admin)
exports.createNotification = asyncHandler(async (req, res, next) => {
  // Check if admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`Only admins can create notifications`, 403)
    );
  }

  // Basic validation for required fields
  if (!req.body.title || !req.body.message || !req.body.user || !req.body.type) {
    return next(
      new ErrorResponse('Please provide all required fields', 400)
    );
  }

  // Validate notification type
  if (!['course', 'payment', 'reminder', 'system'].includes(req.body.type)) {
    return next(
      new ErrorResponse(`Invalid notification type`, 400)
    );
  }

  const notification = await Notification.create(req.body);

  res.status(201).json({
    success: true,
    data: notification
  });
});
