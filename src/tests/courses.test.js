const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../server');
const Course = require('../models/Course');
const User = require('../models/User');

describe('Course Controller', () => {
  let adminToken;
  let instructorToken;
  let userToken;
  let adminUser;
  let instructorUser;
  let regularUser;

  beforeEach(async () => {
    // Clear users and courses before each test
    await User.deleteMany({});
    await Course.deleteMany({});

    // Create test users with different roles
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'Password123!',
      role: 'admin'
    });

    instructorUser = await User.create({
      name: 'Instructor User',
      email: 'instructor@example.com',
      password: 'Password123!',
      role: 'instructor'
    });

    regularUser = await User.create({
      name: 'Regular User',
      email: 'user@example.com',
      password: 'Password123!',
      role: 'user'
    });

    // Generate tokens with complete user info
    adminToken = jwt.sign(
      { id: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    instructorToken = jwt.sign(
      { id: instructorUser._id, role: instructorUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    userToken = jwt.sign(
      { id: regularUser._id, role: regularUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
  });

  describe('POST /api/v1/courses', () => {
    it('should create a new course as an instructor', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Test Course',
          description: 'This is a test course description that is long enough to pass validation.',
          shortDescription: 'A brief overview of the test course',
          price: 99.99,
          category: 'Programming',
          duration: '10 hours',
          level: 'Beginner',
          thumbnail: 'https://example.com/thumbnail.jpg',
          instructor: instructorUser._id
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', 'Test Course');
    });

    it('should create a new course as an admin', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Course',
          description: 'This is a test course created by an admin with a sufficiently long description.',
          shortDescription: 'A brief overview of the admin course',
          price: 149.99,
          category: 'Business',
          duration: '15 hours',
          level: 'Advanced',
          thumbnail: 'https://example.com/thumbnail2.jpg',
          instructor: adminUser._id
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', 'Admin Course');
    });

    it('should not allow regular users to create courses', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'User Course',
          description: 'This course should not be created because regular users cannot create courses.',
          price: 49.99,
          category: 'Design'
        });
      
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should validate course data', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Short',
          description: 'Too short',
          price: -10,
          category: ''
        });
      
      expect(res.statusCode).toEqual(422);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/v1/courses', () => {
    beforeEach(async () => {
      // Create some test courses
      await Course.create([
        {
          title: 'JavaScript Fundamentals',
          description: 'Learn the basics of JavaScript programming language with practical examples.',
          shortDescription: 'Master JavaScript basics',
          price: 79.99,
          category: 'Programming',
          duration: '8 hours',
          level: 'Beginner',
          thumbnail: 'https://example.com/js.jpg',
          instructor: instructorUser._id
        },
        {
          title: 'Advanced React',
          description: 'Master React with advanced patterns and state management techniques.',
          shortDescription: 'Advanced React concepts',
          price: 99.99,
          category: 'Programming',
          duration: '12 hours',
          level: 'Advanced',
          thumbnail: 'https://example.com/react.jpg',
          instructor: instructorUser._id
        },
        {
          title: 'Digital Marketing',
          description: 'Learn digital marketing strategies for business growth.',
          shortDescription: 'Digital marketing essentials',
          price: 59.99,
          category: 'Marketing',
          duration: '6 hours',
          level: 'Intermediate',
          thumbnail: 'https://example.com/marketing.jpg',
          instructor: instructorUser._id
        }
      ]);
    });

    it('should get all courses', async () => {
      const res = await request(app)
        .get('/api/v1/courses');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count', 3);
      expect(res.body.data).toHaveLength(3);
    });

    it('should filter courses by category', async () => {
      const res = await request(app)
        .get('/api/v1/courses?category=Programming');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count', 2);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('category', 'Programming');
      expect(res.body.data[1]).toHaveProperty('category', 'Programming');
    });

    it('should search courses by keyword', async () => {
      const res = await request(app)
        .get('/api/v1/courses?keyword=React');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count', 1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('title', 'Advanced React');
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/v1/courses?page=1&limit=2');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count', 3);
      expect(res.body.data).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('next.page', 2);
    });
  });

  describe('GET /api/v1/courses/:id', () => {
    let courseId;

    beforeEach(async () => {
      // Create a test course
      const course = await Course.create({
        title: 'Test Course',
        description: 'This is a test course description.',
        shortDescription: 'A brief overview of the test course',
        price: 99.99,
        category: 'Programming',
        duration: '10 hours',
        level: 'Beginner',
        thumbnail: 'https://example.com/thumbnail.jpg',
        instructor: instructorUser._id
      });
      
      courseId = course._id;
    });

    it('should get a course by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/courses/${courseId}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', 'Test Course');
      expect(res.body.data).toHaveProperty('price', 99.99);
    });

    it('should return 404 for non-existent course', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/courses/${fakeId}`);
      
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Course not found');
    });
  });

  describe('PUT /api/v1/courses/:id', () => {
    let courseId;
    let instructorCourseId;

    beforeEach(async () => {
      // Create a test course
      const course = await Course.create({
        title: 'Test Course',
        description: 'This is a test course description.',
        shortDescription: 'A brief overview of the test course',
        price: 99.99,
        category: 'Programming',
        duration: '10 hours',
        level: 'Beginner',
        thumbnail: 'https://example.com/thumbnail.jpg',
        instructor: new mongoose.Types.ObjectId()
      });
      
      courseId = course._id;

      // Create a course owned by the instructor
      const instructorCourse = await Course.create({
        title: 'Instructor Course',
        description: 'This is a course owned by the instructor.',
        shortDescription: 'A brief overview of the instructor course',
        price: 79.99,
        category: 'Design',
        duration: '8 hours',
        level: 'Intermediate',
        thumbnail: 'https://example.com/thumbnail2.jpg',
        instructor: instructorUser._id
      });
      
      instructorCourseId = instructorCourse._id;
    });

    it('should update a course as an admin', async () => {
      const res = await request(app)
        .put(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Course',
          price: 129.99
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', 'Updated Course');
      expect(res.body.data).toHaveProperty('price', 129.99);
      expect(res.body.data).toHaveProperty('category', 'Programming'); // Unchanged field
    });

    it('should allow instructors to update their own courses', async () => {
      const res = await request(app)
        .put(`/api/v1/courses/${instructorCourseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'My Updated Course',
          category: 'Art'
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', 'My Updated Course');
      expect(res.body.data).toHaveProperty('category', 'Art');
    });

    it('should not allow instructors to update courses they do not own', async () => {
      const res = await request(app)
        .put(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Unauthorized Update'
        });
      
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not allow regular users to update courses', async () => {
      const res = await request(app)
        .put(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'User Update'
        });
      
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/courses/:id', () => {
    let courseId;

    beforeEach(async () => {
      // Create a test course
      const course = await Course.create({
        title: 'Test Course',
        description: 'This is a test course description.',
        shortDescription: 'A brief overview of the test course',
        price: 99.99,
        category: 'Programming',
        duration: '10 hours',
        level: 'Beginner',
        thumbnail: 'https://example.com/thumbnail.jpg',
        instructor: instructorUser._id
      });
      
      courseId = course._id;
    });

    it('should delete a course as an admin', async () => {
      const res = await request(app)
        .delete(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data', {});

      // Verify course is deleted
      const course = await Course.findById(courseId);
      expect(course).toBeNull();
    });

    it('should not allow regular users to delete courses', async () => {
      const res = await request(app)
        .delete(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('success', false);

      // Verify course still exists
      const course = await Course.findById(courseId);
      expect(course).not.toBeNull();
    });
  });
});

describe('Section Management', () => {
  let courseId;
  let instructorUser;
  let instructorToken;
  let userToken;

  beforeEach(async () => {
    // Create instructor user first
    instructorUser = await User.create({
      name: 'Instructor User',
      email: 'section.instructor@example.com',
      password: 'Password123!',
      role: 'instructor'
    });

    // Create regular user
    const regularUser = await User.create({
      name: 'Regular User',
      email: 'section.user@example.com',
      password: 'Password123!',
      role: 'user'
    });

    // Generate tokens
    instructorToken = jwt.sign(
      { id: instructorUser._id, role: instructorUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    userToken = jwt.sign(
      { id: regularUser._id, role: regularUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Create a test course
    const course = await Course.create({
      title: 'Test Course',
      description: 'This is a test course description.',
      shortDescription: 'A brief overview of the test course',
      price: 99.99,
      category: 'Programming',
      duration: '10 hours',
      level: 'Beginner',
      thumbnail: 'https://example.com/thumbnail.jpg',
      instructor: instructorUser._id
    });
    
    courseId = course._id;
  });

  describe('POST /api/v1/courses/:id/sections', () => {
    it('should add a section to a course as an instructor', async () => {
      const res = await request(app)
        .post(`/api/v1/courses/${courseId}/sections`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Introduction Section'
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', 'Introduction Section');
      expect(res.body.data).toHaveProperty('lessons');
      expect(res.body.data.lessons).toHaveLength(0);
    });

    it('should not allow regular users to add sections', async () => {
      const res = await request(app)
        .post(`/api/v1/courses/${courseId}/sections`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Unauthorized Section'
        });
      
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT & DELETE /api/v1/courses/:id/sections/:sectionId', () => {
    let sectionId;

    beforeEach(async () => {
      // Add a section to work with
      const course = await Course.findById(courseId);
      course.sections.push({ title: 'Test Section' });
      await course.save();
      sectionId = course.sections[0]._id;
    });

    it('should update a section', async () => {
      const res = await request(app)
        .put(`/api/v1/courses/${courseId}/sections/${sectionId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Updated Section Title'
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', 'Updated Section Title');
    });

    it('should delete a section', async () => {
      const res = await request(app)
        .delete(`/api/v1/courses/${courseId}/sections/${sectionId}`)
        .set('Authorization', `Bearer ${instructorToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      
      // Verify section is deleted
      const course = await Course.findById(courseId);
      expect(course.sections).toHaveLength(0);
    });
  });
});

describe('Lesson Management', () => {
  let courseId;
  let sectionId;
  let instructorUser;
  let instructorToken;
  let userToken;

  beforeEach(async () => {
    // Create instructor user first
    instructorUser = await User.create({
      name: 'Instructor User',
      email: 'lesson.instructor@example.com',
      password: 'Password123!',
      role: 'instructor'
    });

    // Create regular user
    const regularUser = await User.create({
      name: 'Regular User',
      email: 'lesson.user@example.com',
      password: 'Password123!',
      role: 'user'
    });

    // Generate tokens
    instructorToken = jwt.sign(
      { id: instructorUser._id, role: instructorUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    userToken = jwt.sign(
      { id: regularUser._id, role: regularUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Create a test course with a section
    const course = await Course.create({
      title: 'Test Course',
      description: 'This is a test course description.',
      shortDescription: 'A brief overview of the test course',
      price: 99.99,
      category: 'Programming',
      duration: '10 hours',
      level: 'Beginner',
      thumbnail: 'https://example.com/thumbnail.jpg',
      instructor: instructorUser._id,
      sections: [{ title: 'Test Section' }]
    });
    
    courseId = course._id;
    sectionId = course.sections[0]._id;
  });

  describe('POST /api/v1/courses/:id/sections/:sectionId/lessons', () => {
    it('should add a lesson to a section as an instructor', async () => {
      const res = await request(app)
        .post(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Introduction Lesson',
          description: 'First lesson of the course',
          videoUrl: 'https://example.com/video.mp4',
          duration: '10:00',
          isPreview: true,
          resources: ['https://example.com/notes.pdf']
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', 'Introduction Lesson');
      expect(res.body.data).toHaveProperty('isPreview', true);
      expect(res.body.data.resources).toHaveLength(1);
    });

    it('should not allow regular users to add lessons', async () => {
      const res = await request(app)
        .post(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Unauthorized Lesson'
        });
      
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT & DELETE /api/v1/courses/:id/sections/:sectionId/lessons/:lessonId', () => {
    let lessonId;

    beforeEach(async () => {
      // Add a lesson to work with
      const course = await Course.findById(courseId);
      course.sections[0].lessons.push({
        title: 'Test Lesson',
        description: 'Test description',
        videoUrl: 'https://example.com/video.mp4',
        duration: '10:00'
      });
      await course.save();
      lessonId = course.sections[0].lessons[0]._id;
    });

    it('should update a lesson', async () => {
      const res = await request(app)
        .put(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Updated Lesson Title',
          description: 'Updated description'
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', 'Updated Lesson Title');
      expect(res.body.data).toHaveProperty('description', 'Updated description');
    });

    it('should delete a lesson', async () => {
      const res = await request(app)
        .delete(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${instructorToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      
      // Verify lesson is deleted
      const course = await Course.findById(courseId);
      expect(course.sections[0].lessons).toHaveLength(0);
    });
  });
});

describe('Course Enrollment', () => {
  let courseId;
  let regularUser;
  let instructorUser; // Added instructor user declaration
  let userToken;

  beforeEach(async () => {
    // Create instructor user
    instructorUser = await User.create({
      name: 'Enrollment Instructor',
      email: 'enroll.instructor@example.com',
      password: 'Password123!',
      role: 'instructor'
    });

    // Create regular user
    regularUser = await User.create({
      name: 'Enrollment Test User',
      email: 'enroll.user@example.com',
      password: 'Password123!',
      role: 'user'
    });

    // Generate token
    userToken = jwt.sign(
      { id: regularUser._id, role: regularUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Create a test course
    const course = await Course.create({
      title: 'Enrollment Test Course',
      description: 'This is a course for testing enrollment features.',
      shortDescription: 'Enrollment testing',
      price: 49.99,
      category: 'Testing',
      duration: '5 hours',
      level: 'Beginner',
      thumbnail: 'https://example.com/thumbnail.jpg',
      instructor: instructorUser._id,
      sections: [
        { 
          title: 'Getting Started',
          lessons: [
            {
              title: 'Introduction',
              description: 'Welcome to the course',
              videoUrl: 'https://example.com/video1.mp4',
              duration: '5:00'
            },
            {
              title: 'Setup',
              description: 'Setting up your environment',
              videoUrl: 'https://example.com/video2.mp4',
              duration: '10:00'
            }
          ]
        }
      ]
    });
    
    courseId = course._id;
  });

  describe('POST /api/v1/courses/:id/enroll', () => {
    it('should enroll a user in a course', async () => {
      const res = await request(app)
        .post(`/api/v1/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);

      // Verify user is enrolled
      const user = await User.findById(regularUser._id);
      expect(user.enrolledCourses).toHaveLength(1);
      expect(user.enrolledCourses[0].course.toString()).toBe(courseId.toString());
    });

    it('should not allow enrolling in the same course twice', async () => {
      // First enrollment
      await request(app)
        .post(`/api/v1/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${userToken}`);

      // Try to enroll again
      const res = await request(app)
        .post(`/api/v1/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('Already enrolled');
    });
  });

  describe('GET /api/v1/courses/enrolled', () => {
    it('should get all courses enrolled by the user', async () => {
      // Enroll user in the course
      await request(app)
        .post(`/api/v1/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${userToken}`);

      // Get enrolled courses
      const res = await request(app)
        .get('/api/v1/courses/enrolled')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count', 1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('title', 'Enrollment Test Course');
      expect(res.body.data[0]).toHaveProperty('progress', 0);
      expect(res.body.data[0]).toHaveProperty('completed', false);
      expect(res.body.data[0]).toHaveProperty('enrolledAt');
      expect(res.body.data[0]).toHaveProperty('completedLessons');
    });

    it('should get enrolled courses using query parameter', async () => {
      // Enroll user in the course
      await request(app)
        .post(`/api/v1/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${userToken}`);

      // Get enrolled courses using query parameter
      const res = await request(app)
        .get('/api/v1/courses?enrolled=true')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count', 1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('title', 'Enrollment Test Course');
      expect(res.body.data[0]).toHaveProperty('progress', 0);
      expect(res.body.data[0]).toHaveProperty('completed', false);
    });

    it('should return empty array if user has not enrolled in any courses', async () => {
      const res = await request(app)
        .get('/api/v1/courses/enrolled')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count', 0);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return empty array if user has not enrolled in any courses using query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/courses?enrolled=true')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/courses/enrolled');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should require authentication when using query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/courses?enrolled=true');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/courses/:id/progress', () => {
    // ... existing progress test cases if any ...
  });
});
