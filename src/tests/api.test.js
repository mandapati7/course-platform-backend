const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');

describe('API Integration Tests', () => {
  let userToken;
  let instructorToken;
  let adminToken;
  let testCourse;
  let testUser;
  let testInstructor;
  let testAdmin;

  beforeEach(async () => {
    // Create test users with plain text passwords (model will hash them)
    testUser = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'Password123!',
      role: 'user',
      enrolledCourses: []
    });

    testInstructor = await User.create({
      name: 'Test Instructor',
      email: 'instructor@test.com',
      password: 'Password123!',
      role: 'instructor'
    });

    testAdmin = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'Password123!',
      role: 'admin'
    });

    // Generate tokens with complete user info
    userToken = jwt.sign(
      { id: testUser._id, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    instructorToken = jwt.sign(
      { id: testInstructor._id, role: testInstructor.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    adminToken = jwt.sign(
      { id: testAdmin._id, role: testAdmin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Create a test course
    testCourse = await Course.create({
      title: 'Initial Test Course',
      description: 'A comprehensive test course description that meets the length requirement',
      shortDescription: 'A brief overview of the test course',
      price: 99.99,
      category: 'Technology',
      duration: '10 hours',
      level: 'Beginner',
      thumbnail: 'https://example.com/thumbnail.jpg',
      instructor: testInstructor._id
    });
  });

  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@test.com',
          password: 'Password123!',
          role: 'user'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should login an existing user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should get current user profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('user@test.com');
    });
  });

  describe('Course Management Flow', () => {
    it('should create a new course as instructor', async () => {
      const courseData = {
        title: 'New Test Course',
        description: 'A comprehensive test course description that meets the length requirement',
        shortDescription: 'A brief overview of the test course',
        price: 99.99,
        category: 'Technology',
        duration: '10 hours',
        level: 'Beginner',
        thumbnail: 'https://example.com/thumbnail.jpg'
      };

      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(courseData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(courseData.title);
    });

    it('should get all courses', async () => {
      const res = await request(app)
        .get('/api/v1/courses');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should get a single course', async () => {
      const res = await request(app)
        .get(`/api/v1/courses/${testCourse._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(testCourse.title);
    });
  });

  describe('Payment Flow', () => {
    it('should process a course payment', async () => {
      const res = await request(app)
        .post('/api/v1/payments/stripe')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          courseId: testCourse._id,
          paymentMethodId: 'pm_card_visa'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('completed');
    });

    it('should verify user enrollment after payment', async () => {
      // First make the payment
      await request(app)
        .post('/api/v1/payments/stripe')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          courseId: testCourse._id,
          paymentMethodId: 'pm_card_visa'
        });

      // Then check enrollment
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enrolledCourses).toContainEqual(
        expect.objectContaining({
          course: testCourse._id.toString()
        })
      );
    });
  });
});