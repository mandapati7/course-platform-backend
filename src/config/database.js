const mongoose = require('mongoose');
const logger = require('../utils/logger');

const testConnection = async (uri) => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    };
    
    logger.db('Testing MongoDB connection...');
    logger.db('Connection string:', {
      uri: uri ? `${uri.split('@')[0].split('://')[0]}://*****@${uri.split('@')[1]}` : 'undefined'
    });
    
    const conn = await mongoose.connect(uri, options);
    logger.db('✅ Connection test successful!');
    logger.db(`Connected to database: ${conn.connection.name}`);
    logger.db(`Host: ${conn.connection.host}`);
    logger.db(`Port: ${conn.connection.port}`);
    return true;
  } catch (error) {
    logger.dbError('❌ Connection test failed!');
    logger.dbError('Error details:', {
      type: error.name,
      message: error.message
    });
    
    if (error.name === 'MongoServerSelectionError') {
      logger.dbError('Could not connect to MongoDB server. Possible causes:', {
        reasons: [
          'Invalid connection string',
          'IP not whitelisted',
          'MongoDB server is down'
        ]
      });
    }
    
    if (!uri) {
      logger.dbError('MONGODB_URI is undefined. Please check your environment variables.');
    }
    
    return false;
  }
};

const connectDB = async () => {
  try {
    logger.system("Node Environment: " + process.env.NODE_ENV);

    // Skip connection test in test environment as it uses mongodb-memory-server
    if (process.env.NODE_ENV === 'test') {
      logger.db('Test environment detected, skipping connection test');
      return true;
    }

    logger.db('Attempting to connect to MongoDB Atlas...');
    const isConnected = await testConnection(process.env.MONGODB_URI);
    
    if (!isConnected) {
      logger.dbError('Failed to establish MongoDB connection');
      process.exit(1);
    }

    return true;
  } catch (error) {
    logger.dbError(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;