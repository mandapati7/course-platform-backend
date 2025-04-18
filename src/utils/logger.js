const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log categories and their colors
const categories = {
  database: 'DATABASE',
  security: 'SECURITY',
  api: 'API',
  system: 'SYSTEM',
  video: 'VIDEO',
  payment: 'PAYMENT',
  default: 'DEFAULT'
};

// Define log levels and colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  silly: 5
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  silly: 'grey',
  database: 'cyan',
  security: 'brightRed',
  api: 'brightGreen',
  system: 'brightBlue',
  video: 'brightMagenta',
  payment: 'brightYellow',
  default: 'white'
};

// Set up log format with colors
winston.addColors(colors);

// Define the log format
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize({ all: false }),
  winston.format.printf(info => {
    const { timestamp, level, message, category = categories.default, ...rest } = info;
    const categoryStr = category ? `[${category}]` : '';
    const restString = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '';
    
    // Color the category tag
    let colorizedCategory = categoryStr;
    
    return `[${timestamp}] [${level}] ${colorizedCategory} ${message} ${restString}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.json()
);

// Get log level from environment variable
const env = process.env.NODE_ENV || 'development';
const configuredLogLevel = process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug');

// Get filter settings
const httpFilter = process.env.LOG_FILTER_HTTP !== 'false';

// Create separate transport for each log category
const createCategoryTransport = (category) => {
  return new DailyRotateFile({
    filename: path.join(logDir, `%DATE%-${category.toLowerCase()}.log`),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
    level: configuredLogLevel,
  });
};

// Filter for HTTP logs (can be enabled/disabled)
const httpFilterFn = winston.format((info) => {
  if (info.level === 'http' && !httpFilter) {
    return false;
  }
  return info;
});

// Create the logger
const logger = winston.createLogger({
  level: configuredLogLevel,
  levels,
  format: winston.format.combine(
    httpFilterFn(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' })
  ),
  defaultMeta: { service: 'course-platform' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      level: configuredLogLevel
    }),
    
    // Common log file
    new DailyRotateFile({
      filename: path.join(logDir, '%DATE%-course-platform.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
      level: configuredLogLevel
    }),
    
    // Error log file (errors only)
    new DailyRotateFile({
      filename: path.join(logDir, '%DATE%-error.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
      level: 'error'
    })
  ],
  exitOnError: false,
});

// Add separate transport for each category
Object.values(categories).forEach(category => {
  if (category !== 'DEFAULT') {
    logger.add(createCategoryTransport(category));
  }
});

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
    userId: req.user ? req.user.id : 'unauthenticated'
  };
  
  logger.http(`REQUEST: ${JSON.stringify(reqData)}`, { category: categories.api });
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
  
  logger.http(`RESPONSE: ${JSON.stringify(resData)}`, { category: categories.api });
};

// Category-specific loggers
logger.db = (message, meta = {}) => logger.info(message, { ...meta, category: categories.database });
logger.security = (message, meta = {}) => logger.info(message, { ...meta, category: categories.security });
logger.api = (message, meta = {}) => logger.info(message, { ...meta, category: categories.api });
logger.system = (message, meta = {}) => logger.info(message, { ...meta, category: categories.system });
logger.video = (message, meta = {}) => logger.info(message, { ...meta, category: categories.video });
logger.payment = (message, meta = {}) => logger.info(message, { ...meta, category: categories.payment });

// Category-specific error loggers
logger.dbError = (message, meta = {}) => logger.error(message, { ...meta, category: categories.database });
logger.securityError = (message, meta = {}) => logger.error(message, { ...meta, category: categories.security });
logger.apiError = (message, meta = {}) => logger.error(message, { ...meta, category: categories.api });
logger.systemError = (message, meta = {}) => logger.error(message, { ...meta, category: categories.system });
logger.videoError = (message, meta = {}) => logger.error(message, { ...meta, category: categories.video });
logger.paymentError = (message, meta = {}) => logger.error(message, { ...meta, category: categories.payment });

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

// Overriding console methods to use winston logger with categories
console.log = (...args) => logger.info(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '));
console.info = (...args) => logger.info(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '));
console.warn = (...args) => logger.warn(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '));
console.error = (...args) => logger.error(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '));
console.debug = (...args) => logger.debug(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '));

module.exports = logger;