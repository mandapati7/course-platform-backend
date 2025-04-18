// filepath: c:\Study\course-platform-backend\src\models\ClientLog.js
const mongoose = require('mongoose');

// Define schema for individual log entries
const LogEntrySchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warning', 'error', 'debug'],
    default: 'info'
  },
  message: {
    type: String,
    required: [true, 'Log message is required']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Main client logs schema
const ClientLogSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  deviceInfo: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Device information is required'],
    default: {}
  },
  logs: [LogEntrySchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add TTL index to automatically expire old logs after 30 days
ClientLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('ClientLog', ClientLogSchema);