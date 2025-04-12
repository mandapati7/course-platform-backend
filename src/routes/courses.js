const express = require('express');
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  addReview,
  updateProgress,
  addSection,
  updateSection,
  deleteSection,
  addLesson,
  updateLesson,
  deleteLesson
} = require('../controllers/courses');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(getCourses)
  .post(protect, authorize('instructor', 'admin'), createCourse);

router.route('/:id')
  .get(getCourse)
  .put(protect, authorize('instructor', 'admin'), updateCourse)
  .delete(protect, authorize('instructor', 'admin'), deleteCourse);

router.post('/:id/enroll', protect, enrollCourse);
router.post('/:id/reviews', protect, addReview);
router.put('/:id/progress', protect, updateProgress);

// Section routes
router.route('/:id/sections')
  .post(protect, authorize('instructor', 'admin'), addSection);
router.route('/:id/sections/:sectionId')
  .put(protect, authorize('instructor', 'admin'), updateSection)
  .delete(protect, authorize('instructor', 'admin'), deleteSection);

// Lesson routes
router.route('/:id/sections/:sectionId/lessons')
  .post(protect, authorize('instructor', 'admin'), addLesson);
router.route('/:id/sections/:sectionId/lessons/:lessonId')
  .put(protect, authorize('instructor', 'admin'), updateLesson)
  .delete(protect, authorize('instructor', 'admin'), deleteLesson);

module.exports = router;
