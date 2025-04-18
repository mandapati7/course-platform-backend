const path = require("path");
const dotenv = require("dotenv");

// Add timestamp to console logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function() {
  const timestamp = new Date().toISOString();
  originalConsoleLog.apply(console, [`[${timestamp}]`, ...arguments]);
};

console.error = function() {
  const timestamp = new Date().toISOString();
  originalConsoleError.apply(console, [`[${timestamp}] ERROR:`, ...arguments]);
};

// Construct the env file path
const envFile = `.env.${process.env.NODE_ENV}`;
const envPath = path.resolve(process.cwd(), envFile);

console.log(`Looking for environment file: ${envPath}`);

// Load env file
const result = dotenv.config({
  path: envPath,
});

if (result.error) {
  console.error(`Error loading ${envFile}:`, result.error);
  process.exit(1);
}

console.log(`Successfully loaded environment from: ${envFile}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT}`);

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
const videoRoutes = require("./routes/videos"); // Add video routes

// Connect to database
connectDB();

const app = express();

// Application-level request logging
app.use((req, res, next) => {
  console.log("\n=== Incoming Request ===");
  console.log(`${req.method} ${req.originalUrl}`);
  console.log("Headers:", req.headers);

  // Log response
  const oldWrite = res.write;
  const oldEnd = res.end;

  const chunks = [];

  res.write = function (chunk) {
    if (chunk) {
      // Ensure chunk is a buffer
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return oldWrite.apply(res, arguments);
  };

  res.end = function (chunk) {
    if (chunk) {
      // Ensure chunk is a buffer
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    console.log("\n=== Response ===");
    console.log("Status:", res.statusCode);

    try {
      if (chunks.length > 0) {
        const body = Buffer.concat(chunks).toString("utf8");
        console.log(
          "Body:",
          body.length > 1000
            ? body.substring(0, 1000) + "... (truncated)"
            : body
        );
      } else {
        console.log("Body: <empty>");
      }
    } catch (err) {
      console.log("Error logging response body:", err.message);
    }

    oldEnd.apply(res, arguments);
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
app.use("/api/v1/videos", videoRoutes); // Add video routes

// Error handler middleware
app.use(errorHandler);

// Explicitly parse port as integer and provide detailed logging
const PORT = parseInt(process.env.PORT, 10);
if (isNaN(PORT)) {
  console.error("Invalid PORT in environment variables");
  process.exit(1);
}

// Only start the server if we're not in a test environment
if (process.env.NODE_ENV !== "test") {
  try {
    const server = app.listen(PORT, () => {
      console.log("\n=== Server Status ===");
      console.log(`Server running on port ${PORT}`);
      console.log(`Try accessing: http://localhost:${PORT}/test`);
    });

    server.on("error", (error) => {
      console.error("Server startup error:", error);
      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${PORT} is already in use. Please try a different port or kill the process using this port.`
        );
      }
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err, promise) => {
      console.error("Unhandled Promise Rejection:", err);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

module.exports = app;
