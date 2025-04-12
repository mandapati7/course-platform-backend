const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const Notification = require('../models/Notification');
const User = require('../models/User');

let userToken;
let adminToken;
let testUser;
let adminUser;
let testNotification;

beforeEach(async () => {
  // Create test users first
  testUser = await User.create({
    name: 'Test User',
    email: 'testuser@test.com',
    password: 'password123',
    role: 'user'
  });

  adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin'
  });

  // Generate tokens with complete user info including role
  userToken = jwt.sign(
    { id: testUser._id, role: testUser.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  adminToken = jwt.sign(
    { id: adminUser._id, role: adminUser.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  // Create a test notification
  testNotification = await Notification.create({
    title: 'Test Notification',
    message: 'This is a test notification',
    user: testUser._id,
    unread: true,
    type: 'system'
  });
});

afterEach(async () => {
  // Clean up notifications and users
  await Promise.all([
    Notification.deleteMany({}),
    User.deleteMany({})
  ]);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('Notification Controller', () => {
  describe('GET /api/v1/notifications', () => {
    it('should get user notifications', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Test Notification');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('should return empty array when user has no notifications', async () => {
      await Notification.deleteMany({}); // Clear all notifications
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should support pagination', async () => {
      // Create additional notifications for pagination testing
      const notifications = Array.from({ length: 15 }, (_, i) => ({
        title: `Test Notification ${i + 1}`,
        message: `This is test notification ${i + 1}`,
        user: testUser._id,
        unread: true,
        type: 'system'
      }));

      // Insert additional notifications
      await Notification.insertMany(notifications);

      const page1 = await request(app)
        .get('/api/v1/notifications?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(page1.status).toBe(200);
      expect(page1.body.data.length).toBe(10);
      
      const page2 = await request(app)
        .get('/api/v1/notifications?page=2&limit=10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(page2.status).toBe(200);
      expect(page2.body.data.length).toBe(6); // 16 total (15 + 1 from beforeEach)
    });

    it('should filter by unread status', async () => {
      await Notification.create([
        {
          title: 'Read Notification',
          message: 'This is a read notification',
          user: testUser._id,
          unread: false,
          type: 'system'
        },
        {
          title: 'Unread Notification',
          message: 'This is an unread notification',
          user: testUser._id,
          unread: true,
          type: 'system'
        }
      ]);

      const res = await request(app)
        .get('/api/v1/notifications?unread=true')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(n => n.unread)).toBe(true);
    });
  });

  describe('PUT /api/v1/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const res = await request(app)
        .put(`/api/v1/notifications/${testNotification._id}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unread).toBe(false);
    });

    it('should handle concurrent mark-as-read operations correctly', async () => {
      const markOperations = Array.from({ length: 5 }, () => 
        request(app)
          .put(`/api/v1/notifications/${testNotification._id}/read`)
          .set('Authorization', `Bearer ${userToken}`)
      );

      const results = await Promise.all(markOperations);
      
      results.forEach(res => {
        expect(res.status).toBe(200);
      });

      const notification = await Notification.findById(testNotification._id);
      expect(notification.unread).toBe(false);
    });

    it('should not allow marking other users notifications as read', async () => {
      // Create another user's notification
      const otherNotification = await Notification.create({
        title: 'Other Notification',
        message: 'This is another user\'s notification',
        user: adminUser._id,
        unread: true,
        type: 'system'
      });

      const res = await request(app)
        .put(`/api/v1/notifications/${otherNotification._id}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/v1/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put(`/api/v1/notifications/${testNotification._id}/read`);
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/notifications/read-all', () => {
    it('should mark all user notifications as read', async () => {
      // Create multiple notifications
      await Notification.create([
        {
          title: 'Test Notification 2',
          message: 'This is another test notification',
          user: testUser._id,
          unread: true,
          type: 'system'
        },
        {
          title: 'Test Notification 3',
          message: 'This is yet another test notification',
          user: testUser._id,
          unread: true,
          type: 'system'
        }
      ]);

      const res = await request(app)
        .put('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify all notifications are marked as read
      const notifications = await Notification.find({ user: testUser._id });
      expect(notifications.every(n => !n.unread)).toBe(true);
    });

    it('should handle case when user has no unread notifications', async () => {
      // First mark all as read
      await Notification.updateMany(
        { user: testUser._id },
        { unread: false }
      );

      const res = await request(app)
        .put('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put('/api/v1/notifications/read-all');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    it('should delete notification', async () => {
      const res = await request(app)
        .delete(`/api/v1/notifications/${testNotification._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify notification is deleted
      const notification = await Notification.findById(testNotification._id);
      expect(notification).toBeNull();
    });

    it('should not allow deleting other users notifications', async () => {
      // Create another user's notification
      const otherNotification = await Notification.create({
        title: 'Other Notification',
        message: 'This is another user\'s notification',
        user: adminUser._id,
        unread: true,
        type: 'system'
      });

      const res = await request(app)
        .delete(`/api/v1/notifications/${otherNotification._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/notifications/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/notifications', () => {
    it('should allow admin to create notification', async () => {
      const newNotification = {
        title: 'Admin Notification',
        message: 'This is an admin created notification',
        user: testUser._id,
        type: 'system',
        unread: true
      };

      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newNotification);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(newNotification.title);
    });

    it('should allow admin to create notifications with different types', async () => {
      const notificationTypes = ['course', 'payment', 'reminder', 'system'];
      
      for (const type of notificationTypes) {
        const newNotification = {
          title: `${type} Notification`,
          message: `This is a ${type} notification`,
          user: testUser._id,
          unread: true,
          type
        };

        const res = await request(app)
          .post('/api/v1/notifications')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(newNotification);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.type).toBe(type);
      }
    });

    it('should reject invalid notification type', async () => {
      const newNotification = {
        title: 'Invalid Type Notification',
        message: 'This should fail',
        user: testUser._id,
        unread: true,
        type: 'invalid_type'
      };

      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newNotification);

      expect(res.status).toBe(400);
    });

    it('should not allow regular users to create notifications', async () => {
      const newNotification = {
        title: 'User Notification',
        message: 'This should not be allowed',
        user: testUser._id,
        unread: true
      };

      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newNotification);

      expect(res.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const invalidNotification = {
        // Missing required fields
      };

      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidNotification);

      expect(res.status).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const newNotification = {
        title: 'Test Notification',
        message: 'Test message',
        user: testUser._id
      };

      const res = await request(app)
        .post('/api/v1/notifications')
        .send(newNotification);

      expect(res.status).toBe(401);
    });

    it('should handle special characters in notification content', async () => {
      const newNotification = {
        title: 'Special & Characters " < > Test',
        message: 'Message with émojis 🎉 and symbols &<>',
        user: testUser._id,
        type: 'system',
        unread: true
      };

      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newNotification);

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe(newNotification.title);
      expect(res.body.data.message).toBe(newNotification.message);
    });

    it('should handle concurrent notification creation', async () => {
      const notifications = Array.from({ length: 5 }, (_, i) => ({
        title: `Concurrent Notification ${i}`,
        message: `Test message ${i}`,
        user: testUser._id,
        type: 'system',
        unread: true
      }));

      const promises = notifications.map(notification =>
        request(app)
          .post('/api/v1/notifications')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(notification)
      );

      const results = await Promise.all(promises);
      
      results.forEach(res => {
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });
    });
  });
});