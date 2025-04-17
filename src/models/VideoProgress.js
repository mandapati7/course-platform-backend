const mongoose = require('mongoose');

const VideoProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoId: {
    type: String,
    required: true
  },
  currentTime: {
    type: Number,
    required: true,
    default: 0
  },
  duration: {
    type: Number,
    required: true
  },
  lessonId: {
    type: String
  },
  courseId: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  completed: {
    type: Boolean,
    default: false
  }
});

// Create a compound index for faster queries
VideoProgressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('VideoProgress', VideoProgressSchema);