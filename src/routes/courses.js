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
  deleteLesson,
  getEnrolledCourses
} = require('../controllers/courses');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// This route needs to be before the :id routes to prevent "enrolled" from being treated as an ID
router.get('/enrolled', protect, getEnrolledCourses);

// Apply protect middleware to /api/v1/courses?enrolled=true
router.get('/', (req, res, next) => {
  if (req.query.enrolled === 'true') {
    // Handle authentication errors explicitly for the enrolled query parameter
    if (!req.headers.authorization) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    return protect(req, res, (err) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized to access this route'
        });
      }
      // After authentication, call getEnrolledCourses
      return getEnrolledCourses(req, res, next);
    });
  }
  // For normal requests without enrolled parameter, continue to getCourses
  return getCourses(req, res, next);
});

router.post('/', protect, authorize('instructor', 'admin'), createCourse);

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
