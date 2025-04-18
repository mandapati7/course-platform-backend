const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Categories for logs to organize them into separate files
const categories = {
  default: 'DEFAULT',
  api: 'API',
  database: 'DATABASE',
  security: 'SECURITY',
  system: 'SYSTEM',
  video: 'VIDEO',
  payment: 'PAYMENT',
};

// Helper function to properly format error objects for logging
const formatError = (err) => {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack,
      name: err.name,
      // Include any custom properties from the error
      ...Object.getOwnPropertyNames(err).reduce((acc, prop) => {
        if (!['message', 'stack', 'name'].includes(prop)) {
          acc[prop] = err[prop];
        }
        return acc;
      }, {})
    };
  }
  return err;
};

// Format for console output (colorized)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, category, tracking, error, ...rest }) => {
    // Basic log line
    let logLine = `${timestamp} ${level}: `;
    
    // If message is an Error object, format it properly
    if (message instanceof Error) {
      logLine += message.message;
      // Move error details to rest
      rest = { ...rest, errorDetails: formatError(message) };
    } else {
      logLine += message;
    }
    
    // Add category if present
    if (category) {
      logLine += ` [${category}]`;
    }
    
    // Add tracking info if present
    if (tracking) {
      const { userId, sessionId, requestId, userRole } = tracking;
      if (userId) logLine += ` User:${userId.substr(0, 6)}...`;
      if (sessionId) logLine += ` Session:${sessionId.substr(0, 6)}...`;
      if (requestId) logLine += ` Request:${requestId.substr(0, 6)}...`;
      if (userRole) logLine += ` Role:${userRole}`;
    }
    
    // Handle error property specifically
    if (error) {
      const formattedError = formatError(error);
      rest.errorDetails = formattedError;
    }
    
    // Add any additional metadata
    if (Object.keys(rest).length > 0) {
      try {
        logLine += ` ${JSON.stringify(rest)}`;
      } catch (e) {
        logLine += ` [Metadata could not be stringified: ${e.message}]`;
      }
    }
    
    return logLine;
  })
);

// Format for file output (json)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.json(),
  winston.format((logObject) => {
    // Handle message if it's an Error object
    if (logObject.message instanceof Error) {
      logObject.errorDetails = formatError(logObject.message);
      logObject.message = logObject.message.message;
    }
    
    // Handle specific error property if present
    if (logObject.error) {
      logObject.errorDetails = formatError(logObject.error);
    }
    
    // Remove empty fields to keep logs clean
    Object.keys(logObject).forEach((key) => {
      if (logObject[key] === undefined || logObject[key] === '') {
        delete logObject[key];
      }
    });
    
    return logObject;
  })(),
  winston.format.printf((logObject) => {
    try {
      return JSON.stringify(logObject);
    } catch (e) {
      // If stringifying fails, create a simpler object
      const safeObject = {
        timestamp: logObject.timestamp,
        level: logObject.level,
        message: 'Error serializing log entry',
        serializationError: e.message,
        originalMessage: typeof logObject.message === 'string' ? logObject.message : '[non-string message]'
      };
      return JSON.stringify(safeObject);
    }
  })
);

// Get log level from environment variable
const env = process.env.NODE_ENV || 'development';
const configuredLogLevel = process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug');

// Get filter settings
let httpFilter = process.env.LOG_FILTER_HTTP !== 'false';

// Filter for HTTP logs (can be enabled/disabled)
const httpFilterFn = winston.format((info) => {
  if (info.level === 'http' && !httpFilter) {
    return false;
  }
  return info;
});

// Create category filters
const createCategoryFilter = (categoryName) => {
  return winston.format((info) => {
    if (info.category === categoryName) {
      return info;
    }
    return false;
  })();
};

// Create default category filter (logs without a specific category)
const defaultCategoryFilter = winston.format((info) => {
  if (!info.category || info.category === categories.default) {
    return info;
  }
  return false;
})();

// Create a base logger with just console transport initially
const logger = winston.createLogger({
  level: configuredLogLevel,
  levels,
  format: winston.format.combine(
    httpFilterFn(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' })
  ),
  defaultMeta: { service: 'course-platform' },
  transports: [
    // Console transport (shows all logs)
    new winston.transports.Console({
      format: consoleFormat,
      level: configuredLogLevel
    })
  ],
  exitOnError: false,
});

// Flag to track if file transports have been initialized
let fileTransportsInitialized = false;

// Function to initialize file transports - MUST be called explicitly to create log files
logger.initFileTransports = () => {
  if (fileTransportsInitialized) {
    logger.info('File transports already initialized, skipping');
    return logger;
  }

  logger.info('Initializing file transport log handlers');

  // Add file transports
  logger.add(
    // Default category log file (only logs without a specific category)
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, '%DATE%-course-platform.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        defaultCategoryFilter,
        fileFormat
      ),
      level: configuredLogLevel
    })
  );
  
  // Error log file (all errors, regardless of category)
  logger.add(
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, '%DATE%-error.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
      level: 'error'
    })
  );

  // Add separate transport for each category
  Object.entries(categories).forEach(([key, categoryName]) => {
    if (categoryName !== categories.default) {
      logger.add(
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, `%DATE%-${key.toLowerCase()}.log`),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            createCategoryFilter(categoryName),
            fileFormat
          ),
          level: configuredLogLevel
        })
      );
    }
  });
  
  fileTransportsInitialized = true;
  logger.info('File transports initialized successfully');
  return logger;
};

// Function to close all log transports gracefully
logger.closeTransports = () => {
  return new Promise((resolve, reject) => {
    logger.info('Closing all log transports');
    logger.end(() => {
      fileTransportsInitialized = false;
      logger.info('Log transports closed successfully');
      resolve();
    });
  });
};

// Add HTTP request logging with category
logger.stream = {
  write: function(message) {
    logger.http(message.trim(), { category: categories.api });
  }
};

// Special handling for request/response logging
logger.logRequest = (req) => {
  // Skip health check endpoints for cleaner logs
  if (req.originalUrl === '/api/v1/health' || req.originalUrl === '/test') {
    return;
  }
  
  const reqData = {
    method: req.method,
    url: req.originalUrl || req.url,
    remoteAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || '',
  };
  
  // Include tracking information if available
  const tracking = {
    userId: req.user?.id || 'unauthenticated',
    sessionId: req.sessionId || 'unknown',
    requestId: req.requestId || 'unknown',
    userRole: req.user?.role || 'guest'
  };
  
  logger.http(`REQUEST: ${JSON.stringify(reqData)}`, { 
    category: categories.api,
    tracking
  });
  return reqData;
};

logger.logResponse = (req, res, responseTime = null) => {
  // Skip health check endpoints for cleaner logs
  if (req.originalUrl === '/api/v1/health' || req.originalUrl === '/test') {
    return;
  }
  
  const resData = {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined
  };
  
  // Include tracking information if available with most current user info
  const tracking = {
    userId: req.user?.id || 'unauthenticated',
    sessionId: req.sessionId || 'unknown',
    requestId: req.requestId || 'unknown',
    userRole: req.user?.role || 'guest'
  };
  
  logger.http(`RESPONSE: ${JSON.stringify(resData)}`, { 
    category: categories.api,
    tracking
  });
};

// Category-specific loggers
logger.db = (message, meta = {}) => logger.info(message, { ...meta, category: categories.database });
logger.security = (message, meta = {}) => logger.info(message, { ...meta, category: categories.security });
logger.api = (message, meta = {}) => logger.info(message, { ...meta, category: categories.api });
logger.system = (message, meta = {}) => logger.info(message, { ...meta, category: categories.system });
logger.video = (message, meta = {}) => logger.info(message, { ...meta, category: categories.video });
logger.payment = (message, meta = {}) => logger.info(message, { ...meta, category: categories.payment });

// Category-specific error loggers
logger.dbError = (message, meta = {}) => {
  if (message instanceof Error) {
    return logger.error(message.message, { ...meta, category: categories.database, error: message });
  }
  return logger.error(message, { ...meta, category: categories.database });
};

logger.securityError = (message, meta = {}) => {
  if (message instanceof Error) {
    return logger.error(message.message, { ...meta, category: categories.security, error: message });
  }
  return logger.error(message, { ...meta, category: categories.security });
};

logger.apiError = (message, meta = {}) => {
  if (message instanceof Error) {
    return logger.error(message.message, { ...meta, category: categories.api, error: message });
  }
  return logger.error(message, { ...meta, category: categories.api });
};

logger.systemError = (message, meta = {}) => {
  if (message instanceof Error) {
    return logger.error(message.message, { ...meta, category: categories.system, error: message });
  }
  return logger.error(message, { ...meta, category: categories.system });
};

logger.videoError = (message, meta = {}) => {
  if (message instanceof Error) {
    return logger.error(message.message, { ...meta, category: categories.video, error: message });
  }
  return logger.error(message, { ...meta, category: categories.video });
};

logger.paymentError = (message, meta = {}) => {
  if (message instanceof Error) {
    return logger.error(message.message, { ...meta, category: categories.payment, error: message });
  }
  return logger.error(message, { ...meta, category: categories.payment });
};

// Helper to change log level at runtime
logger.setLogLevel = (level) => {
  if (levels[level] !== undefined) {
    logger.transports.forEach((transport) => {
      transport.level = level;
    });
    return true;
  }
  return false;
};

// Helper to enable/disable HTTP logging at runtime
logger.setHttpLogging = (enabled) => {
  httpFilter = !!enabled;
  return httpFilter;
};

// Flag to track if console methods have been overridden
let consoleMethodsOverridden = false;

// Function to override console methods
logger.overrideConsoleMethods = () => {
  if (consoleMethodsOverridden) {
    return;
  }
  
  // Save the original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  // Override console methods to use winston logger with categories and better formatting
  console.log = (...args) => {
    const message = args.length === 1 && typeof args[0] === 'string' 
      ? args[0] 
      : args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    
    // Default to 'system' category for uncategorized logs
    logger.info(message, { category: categories.system });
  };
  
  console.info = (...args) => {
    const message = args.length === 1 && typeof args[0] === 'string' 
      ? args[0] 
      : args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    
    logger.info(message, { category: categories.system });
  };
  
  console.warn = (...args) => {
    const message = args.length === 1 && typeof args[0] === 'string' 
      ? args[0] 
      : args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    
    logger.warn(message, { category: categories.system });
  };
  
  console.error = (...args) => {
    // Handle Error objects properly
    if (args.length === 1 && args[0] instanceof Error) {
      const error = args[0];
      logger.error(error.message, { 
        category: categories.system,
        error: error
      });
      return;
    }
    
    const message = args.map(arg => {
      if (arg instanceof Error) {
        return arg.message;
      }
      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    }).join(' ');
    
    logger.error(message, { category: categories.system });
  };
  
  console.debug = (...args) => {
    const message = args.length === 1 && typeof args[0] === 'string' 
      ? args[0] 
      : args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    
    logger.debug(message, { category: categories.system });
  };
  
  consoleMethodsOverridden = true;
  logger.info('Console methods have been overridden to use the logger', { category: categories.system });
  
  // Return original console methods for restoration if needed
  return originalConsole;
};

// Function to restore original console methods
logger.restoreConsoleMethods = (original) => {
  if (original) {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
    console.debug = original.debug;
    consoleMethodsOverridden = false;
  }
};

module.exports = logger;