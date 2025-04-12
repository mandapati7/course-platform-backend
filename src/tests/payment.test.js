const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');

describe('Payment Endpoints', () => {
  let token;
  let testCourse;
  let testUser;

  beforeEach(async () => {
    // Create a test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user',
      enrolledCourses: []
    });

    // Create a test course with all required fields
    testCourse = await Course.create({
      title: 'Test Course',
      description: 'Test Description',
      shortDescription: 'A short description of the test course',
      price: 99.99,
      category: 'Test Category',
      level: 'Beginner',
      duration: '2 hours',
      thumbnail: 'test-thumbnail.jpg',
      instructor: testUser._id,
      totalEnrollments: 0
    });

    // Generate token directly
    token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });
  });

  describe('POST /api/v1/payments/stripe', () => {
    it('should process a stripe payment successfully', async () => {
      const res = await request(app)
        .post('/api/v1/payments/stripe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          courseId: testCourse._id.toString(),
          paymentMethodId: 'pm_card_visa'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('completed');

      // Verify course enrollment
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.enrolledCourses).toHaveLength(1);
      expect(updatedUser.enrolledCourses[0].course.toString()).toBe(testCourse._id.toString());

      // Verify course enrollment count
      const updatedCourse = await Course.findById(testCourse._id);
      expect(updatedCourse.totalEnrollments).toBe(1);
    });

    it('should fail with invalid course ID', async () => {
      const res = await request(app)
        .post('/api/v1/payments/stripe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          courseId: '60d21b4667d0d8992e610c85',
          paymentMethodId: 'pm_card_visa'
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should fail if user is already enrolled', async () => {
      // First payment/enrollment
      const firstRes = await request(app)
        .post('/api/v1/payments/stripe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          courseId: testCourse._id.toString(),
          paymentMethodId: 'pm_card_visa'
        });

      expect(firstRes.status).toBe(200);

      // Try to enroll again
      const secondRes = await request(app)
        .post('/api/v1/payments/stripe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          courseId: testCourse._id.toString(),
          paymentMethodId: 'pm_card_visa'
        });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.success).toBe(false);
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
    await Payment.deleteMany({});
  });
});