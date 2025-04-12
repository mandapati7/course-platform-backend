const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Mock Stripe with proper payment intent structure
const mockStripe = {
  paymentIntents: {
    create: jest.fn().mockImplementation(async (data) => ({
      id: 'pi_test_123',
      object: 'payment_intent',
      amount: data.amount,
      currency: data.currency,
      status: 'succeeded',
      client_secret: 'test_secret',
      metadata: data.metadata,
      payment_method: data.payment_method
    }))
  }
};

// Mock the entire stripe module
jest.mock('stripe', () => {
  return jest.fn(() => mockStripe);
});

let mongoServer;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRE = '1h';

// Connect to the in-memory database before running tests
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to in-memory MongoDB');
  } catch (error) {
    console.error('Error connecting to in-memory MongoDB:', error);
    throw error;
  }
});

// Clear all collections before each test
beforeEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    console.log('Cleared all collections');
  } catch (error) {
    console.error('Error clearing collections:', error);
    throw error;
  }
});

// Reset all mocks after each test
afterEach(() => {
  if (mockStripe.paymentIntents.create.mockClear) {
    mockStripe.paymentIntents.create.mockClear();
  }
});

// Disconnect and stop MongoDB after all tests
afterAll(async () => {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    if (mongoServer) {
      await mongoServer.stop();
      console.log('Stopped MongoDB server');
    }
  } catch (error) {
    console.error('Error in test cleanup:', error);
    throw error;
  }
});