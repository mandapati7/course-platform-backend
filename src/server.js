const path = require("path");
const dotenv = require("dotenv");

// Construct the env file path
const envFile = `.env.${process.env.NODE_ENV}`;
const envPath = path.resolve(process.cwd(), envFile);

// Load env file first (before importing logger)
const result = dotenv.config({
  path: envPath,
});

if (result.error) {
  console.error(`Error loading ${envFile}:`, result.error);
  process.exit(1);
}

// Import the logger after loading environment variables
const logger = require('./utils/logger');

logger.info(`Looking for environment file: ${envPath}`);
logger.info(`Successfully loaded environment from: ${envFile}`);
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`PORT: ${process.env.PORT}`);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middleware/error");
const connectDB = require("./config/database");

// Route files
const authRoutes = require("./routes/auth");
const courseRoutes = require("./routes/courses");
const paymentRoutes = require("./routes/payments");
const notificationRoutes = require("./routes/notifications");
const videoRoutes = require("./routes/videos");

// Connect to database
connectDB();

const app = express();

// Application-level request logging middleware
app.use((req, res, next) => {
  // Log the request when it comes in
  logger.logRequest(req);
  
  // Track response time
  const startTime = Date.now();
  
  // Log response when it goes out
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Call the original end method
    originalEnd.apply(res, arguments);
    
    // Log the response
    logger.logResponse(req, res, responseTime);
  };
  
  next();
});

// Middleware to handle raw body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://localhost:8081",
    ],
    credentials: true,
  })
);

// Cookie parser
app.use(cookieParser());

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Health check endpoint
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Simple test route at root level
app.get("/test", (req, res) => {
  res.send("Server is working!");
});

// Mount routers
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/videos", videoRoutes);

// Error handler middleware
app.use(errorHandler);

// Explicitly parse port as integer
const PORT = parseInt(process.env.PORT, 10);
if (isNaN(PORT)) {
  logger.error("Invalid PORT in environment variables");
  process.exit(1);
}

// Only start the server if we're not in a test environment
if (process.env.NODE_ENV !== "test") {
  try {
    const server = app.listen(PORT, () => {
      logger.info("=== Server Status ===");
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Try accessing: http://localhost:${PORT}/test`);
      
      // Apply timeout settings to server
      server.timeout = 120000; // 2 minute timeout on all requests
      server.keepAliveTimeout = 60000; // 1 minute keep-alive timeout
      
      logger.debug(`Server configured with request timeout: ${server.timeout}ms`);
      logger.debug(`Server configured with keep-alive timeout: ${server.keepAliveTimeout}ms`);
    });
    
    // Set up server timeout handling
    server.on('timeout', (socket) => {
      logger.warn('Connection timeout detected - closing socket to save battery');
      socket.end();
    });

    // Set up idle connection tracking
    let idleTimer = null;
    const IDLE_TIMEOUT = 20 * 60 * 1000; // 20 minutes of inactivity
    
    // Function to check if server has been idle too long
    const checkIdleAndShutdown = () => {
      logger.info('Server has been idle for too long - entering sleep mode to save battery');
      // Close all connections but don't shut down the server completely
      server.getConnections((err, count) => {
        if (!err) {
          logger.info(`Closing ${count} idle connections`);
          // This will make the server reject new connections until activity resumes
          server.maxConnections = 0;
          // Reset the server after a period
          setTimeout(() => {
            server.maxConnections = Infinity;
            logger.info('Server exited sleep mode - ready for new connections');
          }, 10000);
        }
      });
    };

    // Reset idle timer on each request
    app.use((req, res, next) => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      idleTimer = setTimeout(checkIdleAndShutdown, IDLE_TIMEOUT);
      next();
    });
    
    // Initial idle timer start
    idleTimer = setTimeout(checkIdleAndShutdown, IDLE_TIMEOUT);

    server.on("error", (error) => {
      logger.error("Server startup error:", error);
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${PORT} is already in use. Please try a different port or kill the process using this port.`);
      }
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err, promise) => {
      logger.error("Unhandled Promise Rejection:", err);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

module.exports = app;
