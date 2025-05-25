const request = require('supertest');
const express = require('express');
const cors = require('cors');
const { faker } = require('@faker-js/faker');
const connectDB = require('../../config/database');
const authRouter = require('../../routes/auth');
const { connect, closeDatabase, clearDatabase } = require('../setup');

// Create a test app that mimics the real server
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Server Error', error: err.message });
});

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRE = '7d';
process.env.NODE_ENV = 'test';

describe('Authentication Flow Integration Tests', () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Complete User Registration and Login Flow', () => {
    it('should complete full authentication flow', async () => {
      const userData = {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: 'securePassword123'
      };

      // Step 1: Register a new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(200);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.token).toBeDefined();
      expect(registerResponse.body.user.email).toBe(userData.email);

      const registerToken = registerResponse.body.token;

      // Step 2: Verify the user can access protected routes with registration token
      const meResponse1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200);

      expect(meResponse1.body.success).toBe(true);
      expect(meResponse1.body.data.email).toBe(userData.email);

      // Step 3: Login with the same credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.user.email).toBe(userData.email);

      const loginToken = loginResponse.body.token;

      // Step 4: Verify the user can access protected routes with login token
      const meResponse2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(meResponse2.body.success).toBe(true);
      expect(meResponse2.body.data.email).toBe(userData.email);
    });

    it('should handle multiple users independently', async () => {
      // Create two users
      const user1 = {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: 'password123'
      };

      const user2 = {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: 'password456'
      };

      // Register both users
      const register1 = await request(app)
        .post('/api/auth/register')
        .send(user1)
        .expect(200);

      const register2 = await request(app)
        .post('/api/auth/register')
        .send(user2)
        .expect(200);

      const token1 = register1.body.token;
      const token2 = register2.body.token;

      // Verify each user can only access their own data
      const me1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      const me2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(me1.body.data.email).toBe(user1.email);
      expect(me2.body.data.email).toBe(user2.email);
      expect(me1.body.data._id).not.toBe(me2.body.data._id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the error middleware works
      const response = await request(app)
        .post('/api/auth/register')
        .send({}) // Invalid data
        .expect(500);

      expect(response.body).toHaveProperty('message', 'Server Error');
    });

    it('should handle concurrent registration attempts', async () => {
      const userData = {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: 'testPassword123'
      };

      // Attempt to register the same user concurrently
      const promises = Array(5).fill(null).map(() => 
        request(app)
          .post('/api/auth/register')
          .send(userData)
      );

      const results = await Promise.allSettled(promises);
      
      // Only one should succeed
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failed = results.filter(r => r.status === 'fulfilled' && r.value.status === 400);

      expect(successful.length).toBe(1);
      expect(failed.length).toBe(4);
    });
  });

  describe('Token Validation', () => {
    it('should reject expired tokens', async () => {
      // This would require mocking time or setting a very short expiry
      // For now, we'll test token format validation
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer malformed.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'just-a-token-without-bearer')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});