const mongoose = require('mongoose');

const testConnection = async (uri) => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    };
    
    console.log('Testing MongoDB connection...');
    console.log('Connection string:', uri ? `${uri.split('@')[0].split('://')[0]}://*****@${uri.split('@')[1]}` : 'undefined');
    
    const conn = await mongoose.connect(uri, options);
    console.log('✅ Connection test successful!');
    console.log(`Connected to database: ${conn.connection.name}`);
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Port: ${conn.connection.port}`);
    return true;
  } catch (error) {
    console.error('❌ Connection test failed!');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('Could not connect to MongoDB server. Possible causes:');
      console.error('1. Invalid connection string');
      console.error('2. IP not whitelisted');
      console.error('3. MongoDB server is down');
    }
    
    if (!uri) {
      console.error('MONGODB_URI is undefined. Please check your environment variables.');
    }
    
    return false;
  }
};

const connectDB = async () => {
  try {
    console.log("Node Environment: ", process.env.NODE_ENV);

    // Skip connection test in test environment as it uses mongodb-memory-server
    if (process.env.NODE_ENV === 'test') {
      console.log('Test environment detected, skipping connection test');
      return true;
    }

    console.log('Attempting to connect to MongoDB Atlas...');
    const isConnected = await testConnection(process.env.MONGODB_URI);
    
    if (!isConnected) {
      console.error('Failed to establish MongoDB connection');
      process.exit(1);
    }

    return true;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;