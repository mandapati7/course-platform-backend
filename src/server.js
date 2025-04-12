const path = require('path');
const dotenv = require('dotenv');

// Construct the env file path
const envFile = `.env.${process.env.NODE_ENV}`;
const envPath = path.resolve(process.cwd(), envFile);

console.log(`Looking for environment file: ${envPath}`);

// Load env file
const result = dotenv.config({
  path: envPath
});

if (result.error) {
  console.error(`Error loading ${envFile}:`, result.error);
  process.exit(1);
}

console.log(`Successfully loaded environment from: ${envFile}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT}`);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/error');
const connectDB = require('./config/database');

// Route files
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');

// Connect to database
connectDB();

const app = express();

// Application-level request logging
app.use((req, res, next) => {
  console.log('\n=== Incoming Request ===');
  console.log(`${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  
  // Log response
  const oldWrite = res.write;
  const oldEnd = res.end;

  const chunks = [];

  res.write = function (chunk) {
    chunks.push(chunk);
    return oldWrite.apply(res, arguments);
  };

  res.end = function (chunk) {
    if (chunk) chunks.push(chunk);
    console.log('\n=== Response ===');
    console.log('Status:', res.statusCode);
    console.log('Body:', Buffer.concat(chunks).toString('utf8'));
    oldEnd.apply(res, arguments);
  };

  next();
});

// Middleware to handle raw body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Cookie parser
app.use(cookieParser());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Simple test route at root level
app.get('/test', (req, res) => {
  res.send('Server is working!');
});

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Error handler middleware
app.use(errorHandler);

// Explicitly parse port as integer and provide detailed logging
const PORT = parseInt(process.env.PORT, 10);
if (isNaN(PORT)) {
  console.error('Invalid PORT in environment variables');
  process.exit(1);
}

// Only start the server if we're not in a test environment
if (process.env.NODE_ENV !== 'test') {
  try {
    const server = app.listen(PORT, () => {
      console.log('\n=== Server Status ===');
      console.log(`Server running on port ${PORT}`);
      console.log(`Try accessing: http://localhost:${PORT}/test`);
    });

    server.on('error', (error) => {
      console.error('Server startup error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port or kill the process using this port.`);
      }
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
      console.error('Unhandled Promise Rejection:', err);
      server.close(() => process.exit(1));
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

module.exports = app;
