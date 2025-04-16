const express = require("express");
const {
  generateUploadTicket,
  confirmVideoUpload,
  getVideoPlayback,
  togglePreview,
} = require("../controllers/videos");

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

// Instructor routes for video management
router.post(
  "/upload-ticket/:courseId/:sectionIndex/:lessonIndex",
  protect,
  authorize("instructor", "admin"),
  generateUploadTicket
);

router.put(
  "/confirm-upload/:courseId/:sectionIndex/:lessonIndex",
  protect,
  authorize("instructor", "admin"),
  confirmVideoUpload
);

router.put(
  "/toggle-preview/:courseId/:sectionIndex/:lessonIndex",
  protect,
  authorize("instructor", "admin"),
  togglePreview
);

// Student and instructor routes for playback
router.get(
  "/playback/:courseId/:sectionIndex/:lessonIndex",
  protect,
  getVideoPlayback
);

module.exports = router;
