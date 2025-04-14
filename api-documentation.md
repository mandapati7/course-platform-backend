# Course Platform API Documentation

## Overview

This document provides comprehensive documentation for the Course Platform API. The API follows RESTful principles and uses JSON for data exchange.

## Base URL

```
https://api.course-platform.com/api/v1
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

### Authentication Endpoints

#### Register a New User

```
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

#### Login

```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

#### Get Current User

```
GET /auth/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

#### Forgot Password

```
POST /auth/forgotpassword
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### Reset Password

```
PUT /auth/resetpassword/:resettoken
```

**Request Body:**
```json
{
  "password": "NewPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Courses

### Course Endpoints

#### Get All Courses

```
GET /courses
```

**Query Parameters:**
- `keyword` - Search by title or description
- `category` - Filter by category
- `price[lt]` - Price less than
- `price[gt]` - Price greater than
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "pagination": {
    "next": {
      "page": 2,
      "limit": 10
    },
    "prev": {
      "page": 0,
      "limit": 10
    }
  },
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c85",
      "title": "React Fundamentals",
      "description": "Learn the basics of React",
      "price": 99.99,
      "category": "Programming",
      "instructor": {
        "_id": "60d21b4667d0d8992e610c85",
        "name": "John Doe"
      },
      "rating": 4.5,
      "createdAt": "2025-04-09T12:00:00.000Z"
    },
    {
      "_id": "60d21b4667d0d8992e610c86",
      "title": "Advanced JavaScript",
      "description": "Master JavaScript concepts",
      "price": 129.99,
      "category": "Programming",
      "instructor": {
        "_id": "60d21b4667d0d8992e610c86",
        "name": "Jane Smith"
      },
      "rating": 4.8,
      "createdAt": "2025-04-09T12:00:00.000Z"
    }
  ]
}
```

#### Get Single Course

```
GET /courses/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "title": "React Fundamentals",
    "description": "Learn the basics of React",
    "price": 99.99,
    "category": "Programming",
    "instructor": {
      "_id": "60d21b4667d0d8992e610c85",
      "name": "John Doe"
    },
    "rating": 4.5,
    "createdAt": "2025-04-09T12:00:00.000Z",
    "content": [
      {
        "_id": "60d21b4667d0d8992e610c87",
        "title": "Introduction to React",
        "type": "video",
        "duration": 15,
        "url": "https://example.com/videos/intro-to-react"
      },
      {
        "_id": "60d21b4667d0d8992e610c88",
        "title": "Components and Props",
        "type": "video",
        "duration": 20,
        "url": "https://example.com/videos/components-and-props"
      }
    ]
  }
}
```

#### Create Course

```
POST /courses
```

**Request Body:**
```json
{
  "title": "React Fundamentals",
  "description": "Learn the basics of React",
  "price": 99.99,
  "category": "Programming",
  "content": [
    {
      "title": "Introduction to React",
      "type": "video",
      "duration": 15,
      "url": "https://example.com/videos/intro-to-react"
    },
    {
      "title": "Components and Props",
      "type": "video",
      "duration": 20,
      "url": "https://example.com/videos/components-and-props"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "title": "React Fundamentals",
    "description": "Learn the basics of React",
    "price": 99.99,
    "category": "Programming",
    "instructor": "60d21b4667d0d8992e610c85",
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

#### Update Course

```
PUT /courses/:id
```

**Request Body:**
```json
{
  "title": "React Fundamentals Updated",
  "price": 89.99
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "title": "React Fundamentals Updated",
    "description": "Learn the basics of React",
    "price": 89.99,
    "category": "Programming",
    "instructor": "60d21b4667d0d8992e610c85",
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

#### Delete Course

```
DELETE /courses/:id
```

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

#### Get Enrolled Courses

```
GET /courses/enrolled
```

**Description:**
Retrieves all courses that the current authenticated user is enrolled in, along with enrollment details like progress, completion status and completed lessons.

**Authentication Required:** Yes

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c85",
      "title": "React Fundamentals",
      "description": "Learn the basics of React",
      "thumbnail": "https://example.com/thumbnails/react.jpg",
      "instructor": {
        "_id": "60d21b4667d0d8992e610c85",
        "name": "John Doe",
        "profileImage": "https://example.com/profiles/johndoe.jpg"
      },
      "averageRating": 4.5,
      "sections": [
        {
          "_id": "60d21b4667d0d8992e610c87",
          "title": "Getting Started",
          "lessons": [
            {
              "_id": "60d21b4667d0d8992e610c88",
              "title": "Introduction to React"
            },
            {
              "_id": "60d21b4667d0d8992e610c89",
              "title": "Setting Up Your Development Environment"
            }
          ]
        }
      ],
      "progress": 50,
      "completed": false,
      "enrolledAt": "2025-04-01T12:00:00.000Z",
      "completedLessons": ["60d21b4667d0d8992e610c88"]
    },
    {
      "_id": "60d21b4667d0d8992e610c86",
      "title": "JavaScript Basics",
      "description": "Learn JavaScript from scratch",
      "thumbnail": "https://example.com/thumbnails/javascript.jpg",
      "instructor": {
        "_id": "60d21b4667d0d8992e610c86",
        "name": "Jane Smith",
        "profileImage": "https://example.com/profiles/janesmith.jpg"
      },
      "averageRating": 4.7,
      "sections": [
        {
          "_id": "60d21b4667d0d8992e610c90",
          "title": "JavaScript Fundamentals",
          "lessons": [
            {
              "_id": "60d21b4667d0d8992e610c91",
              "title": "Variables and Data Types"
            },
            {
              "_id": "60d21b4667d0d8992e610c92",
              "title": "Functions and Scope"
            }
          ]
        }
      ],
      "progress": 100,
      "completed": true,
      "enrolledAt": "2025-03-15T12:00:00.000Z",
      "completedLessons": ["60d21b4667d0d8992e610c91", "60d21b4667d0d8992e610c92"]
    }
  ]
}
```

## Sections

### Add Section to Course
POST `/api/v1/courses/:id/sections`
- Requires authentication
- Only instructors and admins can add sections
- Request body:
  ```json
  {
    "title": "Section Title"
  }
  ```

### Update Section
PUT `/api/v1/courses/:id/sections/:sectionId`
- Requires authentication
- Only course instructor or admin can update
- Request body:
  ```json
  {
    "title": "Updated Section Title"
  }
  ```

### Delete Section
DELETE `/api/v1/courses/:id/sections/:sectionId`
- Requires authentication
- Only course instructor or admin can delete
- Deletes the section and all its lessons

## Lessons

### Add Lesson to Section
POST `/api/v1/courses/:id/sections/:sectionId/lessons`
- Requires authentication
- Only instructors and admins can add lessons
- Request body:
  ```json
  {
    "title": "Lesson Title",
    "description": "Lesson description",
    "videoUrl": "https://example.com/video.mp4",
    "duration": "10:00",
    "isPreview": true,
    "resources": [
      {
        "title": "Resource Title",
        "type": "PDF",
        "url": "https://example.com/resource.pdf",
        "size": "1.2MB"
      }
    ]
  }
  ```

### Update Lesson
PUT `/api/v1/courses/:id/sections/:sectionId/lessons/:lessonId`
- Requires authentication
- Only course instructor or admin can update
- Request body: can include any of the fields from the add lesson endpoint

### Delete Lesson
DELETE `/api/v1/courses/:id/sections/:sectionId/lessons/:lessonId`
- Requires authentication
- Only course instructor or admin can delete
- Deletes the lesson and all its resources

## Users

### User Endpoints

#### Get All Users (Admin Only)

```
GET /users
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "2025-04-09T12:00:00.000Z"
    },
    {
      "_id": "60d21b4667d0d8992e610c86",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "instructor",
      "createdAt": "2025-04-09T12:00:00.000Z"
    }
  ]
}
```

#### Get Single User (Admin Only)

```
GET /users/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

#### Create User (Admin Only)

```
POST /users
```

**Request Body:**
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "Password123!",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c87",
    "name": "New User",
    "email": "newuser@example.com",
    "role": "user",
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

#### Update User (Admin Only)

```
PUT /users/:id
```

**Request Body:**
```json
{
  "name": "Updated User",
  "role": "instructor"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "Updated User",
    "email": "john@example.com",
    "role": "instructor",
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

#### Delete User (Admin Only)

```
DELETE /users/:id
```

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

## Enrollments

### Enrollment Endpoints

#### Enroll in a Course

```
POST /courses/:id/enroll
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c88",
    "user": "60d21b4667d0d8992e610c85",
    "course": "60d21b4667d0d8992e610c86",
    "status": "active",
    "progress": 0,
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

#### Get User Enrollments

```
GET /enrollments
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c88",
      "course": {
        "_id": "60d21b4667d0d8992e610c86",
        "title": "React Fundamentals",
        "instructor": {
          "name": "John Doe"
        }
      },
      "status": "active",
      "progress": 30,
      "createdAt": "2025-04-09T12:00:00.000Z"
    },
    {
      "_id": "60d21b4667d0d8992e610c89",
      "course": {
        "_id": "60d21b4667d0d8992e610c87",
        "title": "Advanced JavaScript",
        "instructor": {
          "name": "Jane Smith"
        }
      },
      "status": "completed",
      "progress": 100,
      "createdAt": "2025-04-09T12:00:00.000Z"
    }
  ]
}
```

#### Update Enrollment Progress

```
PUT /enrollments/:id/progress
```

**Request Body:**
```json
{
  "progress": 50,
  "completedItems": ["60d21b4667d0d8992e610c87"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c88",
    "user": "60d21b4667d0d8992e610c85",
    "course": "60d21b4667d0d8992e610c86",
    "status": "active",
    "progress": 50,
    "completedItems": ["60d21b4667d0d8992e610c87"],
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

## Payments

### Payment Endpoints

#### Process Payment

```
POST /payments
```

**Request Body:**
```json
{
  "courseId": "60d21b4667d0d8992e610c86",
  "paymentMethod": "stripe",
  "token": "tok_visa"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c90",
    "user": "60d21b4667d0d8992e610c85",
    "course": "60d21b4667d0d8992e610c86",
    "amount": 99.99,
    "paymentMethod": "stripe",
    "status": "completed",
    "transactionId": "ch_1J0XYZ2eZvKYlo2C0XYZ1234",
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

#### Get Payment History

```
GET /payments
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c90",
      "course": {
        "_id": "60d21b4667d0d8992e610c86",
        "title": "React Fundamentals"
      },
      "amount": 99.99,
      "paymentMethod": "stripe",
      "status": "completed",
      "createdAt": "2025-04-09T12:00:00.000Z"
    },
    {
      "_id": "60d21b4667d0d8992e610c91",
      "course": {
        "_id": "60d21b4667d0d8992e610c87",
        "title": "Advanced JavaScript"
      },
      "amount": 129.99,
      "paymentMethod": "paypal",
      "status": "completed",
      "createdAt": "2025-04-09T12:00:00.000Z"
    }
  ]
}
```

## Notifications

### Notification Endpoints

#### Get User Notifications

```
GET /notifications
```

**Query Parameters:**
- `unread` - Filter by unread status (true/false)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "pagination": {
    "next": {
      "page": 2,
      "limit": 10
    },
    "prev": {
      "page": 0,
      "limit": 10
    }
  },
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c85",
      "title": "New course available",
      "message": "A new course has been added to your enrolled courses",
      "user": "60d21b4667d0d8992e610c85",
      "unread": true,
      "createdAt": "2025-04-09T12:00:00.000Z"
    }
  ]
}
```

#### Create Notification (Admin Only)

```
POST /notifications
```

**Request Body:**
```json
{
  "title": "New course available",
  "message": "A new course has been added to your enrolled courses",
  "recipients": ["60d21b4667d0d8992e610c85"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "title": "New course available",
    "message": "A new course has been added to your enrolled courses",
    "user": "60d21b4667d0d8992e610c85",
    "unread": true,
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

#### Mark Notification as Read

```
PUT /notifications/:id/read
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "title": "New course available",
    "message": "A new course has been added to your enrolled courses",
    "user": "60d21b4667d0d8992e610c85",
    "unread": false,
    "createdAt": "2025-04-09T12:00:00.000Z"
  }
}
```

#### Mark All Notifications as Read

```
PUT /notifications/read-all
```

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

#### Delete Notification

```
DELETE /notifications/:id
```

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

## Analytics (Admin Only)

### Analytics Endpoints

#### Get User Analytics

```
GET /analytics/users
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "newUsers": {
      "today": 5,
      "thisWeek": 25,
      "thisMonth": 75
    },
    "usersByRole": {
      "user": 120,
      "instructor": 25,
      "admin": 5
    },
    "activeUsers": {
      "daily": 50,
      "weekly": 100,
      "monthly": 130
    }
  }
}
```

#### Get Course Analytics

```
GET /analytics/courses
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCourses": 50,
    "totalEnrollments": 500,
    "popularCourses": [
      {
        "_id": "60d21b4667d0d8992e610c86",
        "title": "React Fundamentals",
        "enrollments": 120
      },
      {
        "_id": "60d21b4667d0d8992e610c87",
        "title": "Advanced JavaScript",
        "enrollments": 95
      }
    ],
    "categoriesDistribution": {
      "Programming": 25,
      "Design": 15,
      "Business": 10
    }
  }
}
```

#### Get Revenue Analytics

```
GET /analytics/revenue
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 25000,
    "revenueByPeriod": {
      "today": 500,
      "thisWeek": 2500,
      "thisMonth": 10000,
      "thisYear": 25000
    },
    "revenueByCategory": {
      "Programming": 15000,
      "Design": 7000,
      "Business": 3000
    },
    "topSellingCourses": [
      {
        "_id": "60d21b4667d0d8992e610c86",
        "title": "React Fundamentals",
        "revenue": 12000
      },
      {
        "_id": "60d21b4667d0d8992e610c87",
        "title": "Advanced JavaScript",
        "revenue": 9500
      }
    ]
  }
}
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    {
      "field": "Error details"
    }
  ]
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Server Error

## Rate Limiting

The API implements rate limiting to prevent abuse:
- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 10 requests per hour
- Failed login attempts: Exponential backoff

## Security

The API implements several security measures:
- JWT authentication with token expiration
- Input validation and sanitization
- CORS configuration
- Security headers (CSP, HSTS, etc.)
- Data encryption for sensitive information
