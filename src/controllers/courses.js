const Course = require("../models/Course");
const User = require("../models/User");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all courses
// @route   GET /api/v1/courses
// @access  Public
exports.getCourses = asyncHandler(async (req, res, next) => {
  // Check if we should return enrolled courses
  if (req.query.enrolled === "true") {
    // For the enrolled parameter we need to verify authentication first
    // Instead of handling authentication here, pass it to the protect middleware
    // and let getEnrolledCourses handle the actual data fetching
    return next();
  }

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = [
    "select",
    "sort",
    "page",
    "limit",
    "keyword",
    "enrolled",
  ];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach((param) => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );

  // Parse the query string
  let queryObj = JSON.parse(queryStr);

  // Add keyword search if present
  if (req.query.keyword) {
    queryObj = {
      ...queryObj,
      $or: [
        { title: { $regex: req.query.keyword, $options: "i" } },
        { description: { $regex: req.query.keyword, $options: "i" } },
      ],
    };
  }

  // Finding resource
  let query = Course.find(queryObj).populate({
    path: "instructor",
    select: "name profileImage",
  });

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(",").join(" ");
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // Get total count before pagination
  const total = await Course.countDocuments(queryObj);

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const courses = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({
    success: true,
    count: total,
    pagination,
    data: courses,
  });
});

// @desc    Get single course
// @route   GET /api/v1/courses/:id
// @access  Public
exports.getCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id)
    .populate({
      path: "instructor",
      select: "name profileImage bio",
    })
    .populate({
      path: "reviews.user",
      select: "name profileImage",
    });

  if (!course) {
    return next(new ErrorResponse("Course not found", 404));
  }

  res.status(200).json({
    success: true,
    data: course,
  });
});

// @desc    Create new course
// @route   POST /api/v1/courses
// @access  Private (Instructor/Admin)
exports.createCourse = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.instructor = req.user.id;

  // Check if user is instructor or admin
  if (req.user.role !== "instructor" && req.user.role !== "admin") {
    return next(new ErrorResponse("Not authorized to create courses", 403));
  }

  const course = await Course.create(req.body);

  res.status(201).json({
    success: true,
    data: course,
  });
});

// @desc    Update course
// @route   PUT /api/v1/courses/:id
// @access  Private (Instructor/Admin)
exports.updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    return next(new ErrorResponse("Course not found", 404));
  }

  // Make sure user is course instructor or admin
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(new ErrorResponse("Not authorized to update this course", 403));
  }

  course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: course,
  });
});

// @desc    Delete course
// @route   DELETE /api/v1/courses/:id
// @access  Private (Instructor/Admin)
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new ErrorResponse("Course not found", 404));
  }

  // Make sure user is course instructor or admin
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(new ErrorResponse("Not authorized to delete this course", 403));
  }

  await Course.deleteOne({ _id: req.params.id });

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Enroll in course
// @route   POST /api/v1/courses/:id/enroll
// @access  Private
exports.enrollCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is already enrolled
  const user = await User.findById(req.user.id);

  // First check if enrolledCourses exists and has items
  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  // Add null/undefined check before accessing course.toString()
  const alreadyEnrolled = user.enrolledCourses.some(
    (enrolledCourse) =>
      enrolledCourse.course &&
      enrolledCourse.course.toString() === req.params.id
  );

  if (alreadyEnrolled) {
    return next(
      new ErrorResponse(`Already enrolled in course ${req.params.id}`, 400)
    );
  }

  // Add course to user's enrolled courses
  user.enrolledCourses.push({
    course: req.params.id,
    enrolledAt: Date.now(),
    progress: 0,
    completed: false,
    completedLessons: [],
  });

  await user.save();

  // Increment course enrollment count
  course.totalEnrollments += 1;
  await course.save();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get enrolled courses for current user
// @route   GET /api/v1/courses/enrolled
// @access  Private
exports.getEnrolledCourses = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: "enrolledCourses.course",
    select:
      "title description thumbnail instructor rating averageRating sections",
    populate: {
      path: "instructor",
      select: "name profileImage",
    },
  });

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  // Format the response data with null check
  const enrolledCourses = user.enrolledCourses
    .filter((enrollment) => enrollment.course) // Filter out any null/undefined courses
    .map((enrollment) => {
      return {
        ...enrollment.course.toObject(),
        progress: enrollment.progress,
        completed: enrollment.completed,
        enrolledAt: enrollment.enrolledAt,
        completedLessons: enrollment.completedLessons,
      };
    });

  res.status(200).json({
    success: true,
    count: enrolledCourses.length,
    data: enrolledCourses,
  });
});

// @desc    Add review to course
// @route   POST /api/v1/courses/:id/reviews
// @access  Private
exports.addReview = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is enrolled in the course
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  // Add null check similar to the enrollCourse function
  const isEnrolled = user.enrolledCourses.some(
    (enrolledCourse) =>
      enrolledCourse.course &&
      enrolledCourse.course.toString() === req.params.id
  );

  if (!isEnrolled && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `You must be enrolled in the course to leave a review`,
        403
      )
    );
  }

  // Check if user already reviewed this course
  const alreadyReviewed = course.reviews.some(
    (review) => review.user && review.user.toString() === req.user.id
  );

  if (alreadyReviewed) {
    return next(
      new ErrorResponse(`You have already reviewed this course`, 400)
    );
  }

  // Add review
  course.reviews.push({
    user: req.user.id,
    rating: req.body.rating,
    text: req.body.text,
  });

  // Calculate average rating
  course.calculateAverageRating();

  await course.save();

  res.status(201).json({
    success: true,
    data: course,
  });
});

// @desc    Update course progress
// @route   PUT /api/v1/courses/:id/progress
// @access  Private
exports.updateProgress = asyncHandler(async (req, res, next) => {
  const { lessonId, completed } = req.body;

  if (!lessonId) {
    return next(new ErrorResponse(`Please provide a lesson ID`, 400));
  }

  const user = await User.findById(req.user.id);

  // Find the enrolled course
  const enrolledCourseIndex = user.enrolledCourses.findIndex(
    (course) => course.course.toString() === req.params.id
  );

  if (enrolledCourseIndex === -1) {
    return next(
      new ErrorResponse(`Not enrolled in course ${req.params.id}`, 404)
    );
  }

  // Update completed lessons
  if (completed) {
    // Add lesson to completed lessons if not already there
    if (
      !user.enrolledCourses[enrolledCourseIndex].completedLessons.includes(
        lessonId
      )
    ) {
      user.enrolledCourses[enrolledCourseIndex].completedLessons.push(lessonId);
    }
  } else {
    // Remove lesson from completed lessons
    user.enrolledCourses[enrolledCourseIndex].completedLessons =
      user.enrolledCourses[enrolledCourseIndex].completedLessons.filter(
        (id) => id.toString() !== lessonId
      );
  }

  // Get course to calculate progress
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new ErrorResponse(`Course not found`, 404));
  }

  // Calculate total lessons with validation
  const totalLessons = course.sections
    ? course.sections.reduce(
        (total, section) =>
          total + (section.lessons ? section.lessons.length : 0),
        0
      )
    : 0;

  // Handle case where course has no lessons
  if (totalLessons === 0) {
    return next(new ErrorResponse(`Course has no lessons`, 400));
  }

  // Calculate progress percentage
  const completedLessonsCount =
    user.enrolledCourses[enrolledCourseIndex].completedLessons.length;
  const progressPercentage = Math.floor(
    (completedLessonsCount / totalLessons) * 100
  );

  // Update progress
  user.enrolledCourses[enrolledCourseIndex].progress = progressPercentage;

  // Check if course is completed
  if (progressPercentage === 100) {
    user.enrolledCourses[enrolledCourseIndex].completed = true;

    // Add certificate if not already exists
    const hasCertificate = user.certificates.some(
      (cert) => cert.course.toString() === req.params.id
    );

    if (!hasCertificate) {
      user.certificates.push({
        course: req.params.id,
        issuedAt: Date.now(),
        certificateUrl: `certificates/${req.params.id}_${req.user.id}.pdf`, // This would be generated
      });
    }
  } else {
    user.enrolledCourses[enrolledCourseIndex].completed = false;
  }

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      progress: user.enrolledCourses[enrolledCourseIndex].progress,
      completed: user.enrolledCourses[enrolledCourseIndex].completed,
      completedLessons:
        user.enrolledCourses[enrolledCourseIndex].completedLessons,
    },
  });
});

// @desc    Add section to course
// @route   POST /api/v1/courses/:id/sections
// @access  Private (Instructor/Admin)
exports.addSection = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is course instructor or admin
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to add sections to this course`,
        403
      )
    );
  }

  const newSection = {
    title: req.body.title,
    lessons: [],
  };

  course.sections.push(newSection);
  await course.save();

  // Return the newly created section
  const addedSection = course.sections[course.sections.length - 1];

  res.status(201).json({
    success: true,
    data: addedSection,
  });
});

// @desc    Update section
// @route   PUT /api/v1/courses/:id/sections/:sectionId
// @access  Private (Instructor/Admin)
exports.updateSection = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is course instructor or admin
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update sections in this course`,
        403
      )
    );
  }

  const section = course.sections.id(req.params.sectionId);

  if (!section) {
    return next(
      new ErrorResponse(
        `Section not found with id of ${req.params.sectionId}`,
        404
      )
    );
  }

  section.title = req.body.title;
  await course.save();

  res.status(200).json({
    success: true,
    data: section,
  });
});

// @desc    Delete section
// @route   DELETE /api/v1/courses/:id/sections/:sectionId
// @access  Private (Instructor/Admin)
exports.deleteSection = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is course instructor or admin
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete sections from this course`,
        403
      )
    );
  }

  const section = course.sections.id(req.params.sectionId);

  if (!section) {
    return next(
      new ErrorResponse(
        `Section not found with id of ${req.params.sectionId}`,
        404
      )
    );
  }

  // Use pull operator instead of remove
  course.sections.pull({ _id: req.params.sectionId });
  await course.save();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Add lesson to section
// @route   POST /api/v1/courses/:id/sections/:sectionId/lessons
// @access  Private (Instructor/Admin)
exports.addLesson = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is course instructor or admin
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to add lessons to this course`,
        403
      )
    );
  }

  const section = course.sections.id(req.params.sectionId);

  if (!section) {
    return next(
      new ErrorResponse(
        `Section not found with id of ${req.params.sectionId}`,
        404
      )
    );
  }

  const newLesson = {
    title: req.body.title,
    description: req.body.description,
    videoUrl: req.body.videoUrl,
    duration: req.body.duration,
    resources: req.body.resources || [],
    isPreview: req.body.isPreview || false,
  };

  section.lessons.push(newLesson);
  await course.save();

  // Return the newly created lesson
  const addedLesson = section.lessons[section.lessons.length - 1];

  res.status(201).json({
    success: true,
    data: addedLesson,
  });
});

// @desc    Update lesson
// @route   PUT /api/v1/courses/:id/sections/:sectionId/lessons/:lessonId
// @access  Private (Instructor/Admin)
exports.updateLesson = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is course instructor or admin
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update lessons in this course`,
        403
      )
    );
  }

  const section = course.sections.id(req.params.sectionId);

  if (!section) {
    return next(
      new ErrorResponse(
        `Section not found with id of ${req.params.sectionId}`,
        404
      )
    );
  }

  const lesson = section.lessons.id(req.params.lessonId);

  if (!lesson) {
    return next(
      new ErrorResponse(
        `Lesson not found with id of ${req.params.lessonId}`,
        404
      )
    );
  }

  Object.assign(lesson, req.body);
  await course.save();

  res.status(200).json({
    success: true,
    data: lesson,
  });
});

// @desc    Delete lesson
// @route   DELETE /api/v1/courses/:id/sections/:sectionId/lessons/:lessonId
// @access  Private (Instructor/Admin)
exports.deleteLesson = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is course instructor or admin
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete lessons from this course`,
        403
      )
    );
  }

  const section = course.sections.id(req.params.sectionId);

  if (!section) {
    return next(
      new ErrorResponse(
        `Section not found with id of ${req.params.sectionId}`,
        404
      )
    );
  }

  const lesson = section.lessons.id(req.params.lessonId);

  if (!lesson) {
    return next(
      new ErrorResponse(
        `Lesson not found with id of ${req.params.lessonId}`,
        404
      )
    );
  }

  // Use pull operator instead of remove
  section.lessons.pull({ _id: req.params.lessonId });
  await course.save();

  res.status(200).json({
    success: true,
    data: {},
  });
});
