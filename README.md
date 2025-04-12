# Course Platform Backend

A robust Node.js-based backend system for an online course platform with features for course management, user authentication, payments integration, and notifications.

## Features

- User Authentication and Authorization
- Course Management
- Payment Processing (via Stripe)
- Notification System
- File Upload Support
- Comprehensive API Documentation
- Testing Suite

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- Jest for Testing
- JWT Authentication
- Stripe Payment Integration

## Prerequisites

- Node.js (Latest LTS version recommended)
- MongoDB
- npm or yarn
- Stripe Account (for payments)

## Environment Setup

Create the following environment files based on your needs:
- `.env.development` - Development environment
- `.env.production` - Production environment
- `.env.test` - Testing environment

Environment variables required:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=1h
CLIENT_URL=http://localhost:3000
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Testing

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Watch mode:
```bash
npm run test:watch
```

## API Endpoints

### Authentication
- POST `/api/v1/auth` - Authentication endpoints

### Courses
- GET `/api/v1/courses` - Get all courses
- POST `/api/v1/courses` - Create a new course
- GET `/api/v1/courses/:id` - Get a specific course
- PUT `/api/v1/courses/:id` - Update a course
- DELETE `/api/v1/courses/:id` - Delete a course

### Payments
- POST `/api/v1/payments` - Process payments

### Notifications
- GET `/api/v1/notifications` - Get user notifications
- POST `/api/v1/notifications` - Create notification

For detailed API documentation, please refer to `api-documentation.md`

## Testing API Endpoints

You can use the provided scripts to test all endpoints:
- Windows: `.\all-endpoints-test.ps1`
- Linux/Mac: `./all-endpoints-test.sh`

## Security Features

- CORS protection
- XSS protection
- Rate limiting
- MongoDB query sanitization
- Secure HTTP headers (via helmet)
- JWT token-based authentication

## Author

Gopikrishna Mandapati

## License

ISC