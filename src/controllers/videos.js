const Course = require("../models/Course");
const User = require("../models/User");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");
const vimeoService = require("../utils/vimeoService");

// @desc    Generate a Vimeo upload ticket
// @route   POST /api/v1/videos/upload-ticket/:courseId/:sectionIndex/:lessonIndex
// @access  Private (Instructors only)
exports.generateUploadTicket = asyncHandler(async (req, res, next) => {
  const { courseId, sectionIndex, lessonIndex } = req.params;
  const { name, description, fileSize } = req.body;

  console.log(
    `Debug - Auth check: User ID: ${req.user.id}, User role: ${req.user.role}`
  );

  // Find course
  const course = await Course.findById(courseId);
  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${courseId}`, 404)
    );
  }

  console.log(
    `Debug - Course instructor: ${course.instructor}, User ID: ${req.user.id}`
  );

  // Check if user is the course instructor or an admin
  // Check if user is the course instructor
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse(`Not authorized to upload videos to this course`, 403)
    );
  }

  // Verify section and lesson exist
  if (
    !course.sections[sectionIndex] ||
    !course.sections[sectionIndex].lessons[lessonIndex]
  ) {
    return next(new ErrorResponse("Section or lesson not found", 404));
  }

  const section = course.sections[sectionIndex];
  const lesson = section.lessons[lessonIndex];

  // Create or get a folder for the course
  let folderId;
  if (!course.vimeoFolderId) {
    folderId = await vimeoService.createCourseFolder(course.title, course._id);

    // Update course with folder ID
    course.vimeoFolderId = folderId;
    await course.save();
  } else {
    folderId = course.vimeoFolderId;
  }

  // Generate upload ticket
  const uploadTicket = await vimeoService.createUploadTicket({
    name: name || `${course.title} - ${section.title} - ${lesson.title}`,
    description: description || `Lesson video for ${lesson.title}`,
    size: fileSize,
    folderId,
  });

  // Update lesson with video ID (but not yet ready)
  lesson.videoProvider = "vimeo";
  lesson.videoId = uploadTicket.video_id;
  lesson.videoStatus = "uploading";
  await course.save();

  // Return upload link to client
  res.status(200).json({
    success: true,
    data: {
      uploadLink: uploadTicket.upload_link,
      videoId: uploadTicket.video_id,
    },
  });
});

// @desc    Confirm video upload complete
// @route   PUT /api/v1/videos/confirm-upload/:courseId/:sectionIndex/:lessonIndex
// @access  Private (Instructors only)
exports.confirmVideoUpload = asyncHandler(async (req, res, next) => {
  const { courseId, sectionIndex, lessonIndex } = req.params;

  // Find course
  const course = await Course.findById(courseId);
  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${courseId}`, 404)
    );
  }

  // Check if user is the course instructor
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(new ErrorResponse(`Not authorized to update this course`, 403));
  }

  // Verify section and lesson exist
  if (
    !course.sections[sectionIndex] ||
    !course.sections[sectionIndex].lessons[lessonIndex]
  ) {
    return next(new ErrorResponse("Section or lesson not found", 404));
  }

  const lesson = course.sections[sectionIndex].lessons[lessonIndex];

  // Check if video ID exists
  if (!lesson.videoId) {
    return next(new ErrorResponse(`No video found for this lesson`, 404));
  }

  // Get video details from Vimeo
  try {
    const videoDetails = await vimeoService.getVideoDetails(lesson.videoId);

    // Update lesson with video details
    lesson.videoUrl = videoDetails.player_embed_url;
    lesson.thumbnailUrl = videoDetails.pictures?.sizes?.[3]?.link || "";
    lesson.duration = videoDetails.duration
      ? `${Math.floor(videoDetails.duration / 60)}:${(videoDetails.duration % 60).toString().padStart(2, "0")}`
      : "0:00";
    lesson.videoStatus = "ready";

    // Update video privacy based on preview status
    await vimeoService.updateVideoPrivacy(lesson.videoId, lesson.isPreview);

    await course.save();

    res.status(200).json({
      success: true,
      data: {
        videoId: lesson.videoId,
        videoUrl: lesson.videoUrl,
        thumbnailUrl: lesson.thumbnailUrl,
        duration: lesson.duration,
      },
    });
  } catch (error) {
    lesson.videoStatus = "error";
    await course.save();
    return next(
      new ErrorResponse(`Error retrieving video: ${error.message}`, 500)
    );
  }
});

// @desc    Get secure video playback details
// @route   GET /api/v1/videos/playback/:courseId/:sectionIndex/:lessonIndex
// @access  Private (Enrolled Students, Instructors, Admins)
exports.getVideoPlayback = asyncHandler(async (req, res, next) => {
  const { courseId, sectionIndex, lessonIndex } = req.params;

  // Find course
  const course = await Course.findById(courseId);
  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${courseId}`, 404)
    );
  }

  // Verify section and lesson exist
  if (
    !course.sections[sectionIndex] ||
    !course.sections[sectionIndex].lessons[lessonIndex]
  ) {
    return next(new ErrorResponse("Section or lesson not found", 404));
  }

  const lesson = course.sections[sectionIndex].lessons[lessonIndex];

  // If no video or not ready yet
  if (!lesson.videoId || lesson.videoStatus !== "ready") {
    return next(new ErrorResponse("Video not available", 404));
  }

  // Check if video is preview or if user has access
  const hasAccess =
    lesson.isPreview ||
    course.instructor.toString() === req.user.id ||
    req.user.role === "admin";

  if (!hasAccess) {
    // Check if user is enrolled
    const user = await User.findById(req.user.id);
    const isEnrolled =
      user.enrolledCourses &&
      user.enrolledCourses.some(
        (enrollment) =>
          enrollment.course && enrollment.course.toString() === courseId
      );

    if (!isEnrolled) {
      return next(new ErrorResponse("Not enrolled in this course", 403));
    }

    // Mark as started for progress tracking if enrolled
    // This would be expanded in a real implementation
  }

  // Get fresh video details from Vimeo
  try {
    const videoDetails = await vimeoService.getVideoDetails(lesson.videoId);

    res.status(200).json({
      success: true,
      data: {
        videoId: lesson.videoId,
        embedUrl: videoDetails.player_embed_url,
        htmlEmbed: videoDetails.embed?.html,
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        thumbnailUrl: lesson.thumbnailUrl,
      },
    });
  } catch (error) {
    return next(
      new ErrorResponse(`Error retrieving video: ${error.message}`, 500)
    );
  }
});

// @desc    Toggle video preview status
// @route   PUT /api/v1/videos/toggle-preview/:courseId/:sectionIndex/:lessonIndex
// @access  Private (Instructors only)
exports.togglePreview = asyncHandler(async (req, res, next) => {
  const { courseId, sectionIndex, lessonIndex } = req.params;

  // Find course
  const course = await Course.findById(courseId);
  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${courseId}`, 404)
    );
  }

  // Check if user is the course instructor
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(new ErrorResponse(`Not authorized to update this course`, 403));
  }

  // Verify section and lesson exist
  if (
    !course.sections[sectionIndex] ||
    !course.sections[sectionIndex].lessons[lessonIndex]
  ) {
    return next(new ErrorResponse("Section or lesson not found", 404));
  }

  const lesson = course.sections[sectionIndex].lessons[lessonIndex];

  // Toggle preview status
  lesson.isPreview = !lesson.isPreview;

  // If video exists, update privacy settings on Vimeo
  if (lesson.videoId && lesson.videoProvider === "vimeo") {
    await vimeoService.updateVideoPrivacy(lesson.videoId, lesson.isPreview);
  }

  await course.save();

  res.status(200).json({
    success: true,
    data: {
      isPreview: lesson.isPreview,
    },
  });
});
