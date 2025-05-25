const User = require('../../models/user');
const { faker } = require('@faker-js/faker');
const { connect, closeDatabase, clearDatabase } = require('../setup');

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRE = '7d';

describe('User Model Tests', () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: 'testPassword123'
      };

      const user = await User.create(userData);

      expect(user._id).toBeDefined();
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // Should be hashed
      expect(user.profileImage).toBe('default-profile.jpg');
      expect(user.createdAt).toBeDefined();
    });

    it('should require username', async () => {
      const userData = {
        email: faker.internet.email(),
        password: 'testPassword123'
      };

      await expect(User.create(userData)).rejects.toThrow(/username/i);
    });

    it('should require email', async () => {
      const userData = {
        username: faker.internet.userName(),
        password: 'testPassword123'
      };

      await expect(User.create(userData)).rejects.toThrow(/email/i);
    });

    it('should require password', async () => {
      const userData = {
        username: faker.internet.userName(),
        email: faker.internet.email()
      };

      await expect(User.create(userData)).rejects.toThrow(/password/i);
    });

    it('should validate email format', async () => {
      const userData = {
        username: faker.internet.userName(),
        email: 'invalidemail',
        password: 'testPassword123'
      };

      await expect(User.create(userData)).rejects.toThrow(/valid email/i);
    });

    it('should enforce username length constraints', async () => {
      // Too short
      const shortUsername = {
        username: 'a',
        email: faker.internet.email(),
        password: 'testPassword123'
      };

      await expect(User.create(shortUsername)).rejects.toThrow(/at least 2 characters/i);

      // Too long
      const longUsername = {
        username: 'a'.repeat(21),
        email: faker.internet.email(),
        password: 'testPassword123'
      };

      await expect(User.create(longUsername)).rejects.toThrow(/at most 20 characters/i);
    });

    it('should enforce unique username', async () => {
      const userData = {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: 'testPassword123'
      };

      await User.create(userData);

      const duplicateUser = {
        username: userData.username,
        email: faker.internet.email(),
        password: 'anotherPassword123'
      };

      await expect(User.create(duplicateUser)).rejects.toThrow(/duplicate key/i);
    });

    it('should enforce unique email', async () => {
      const userData = {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: 'testPassword123'
      };

      await User.create(userData);

      const duplicateUser = {
        username: faker.internet.userName(),
        email: userData.email,
        password: 'anotherPassword123'
      };

      await expect(User.create(duplicateUser)).rejects.toThrow(/duplicate key/i);
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const password = 'testPassword123';
      const user = await User.create({
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: password
      });

      expect(user.password).not.toBe(password);
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
    });

    it('should not rehash password if not modified', async () => {
      const user = await User.create({
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: 'testPassword123'
      });

      const originalHash = user.password;
      user.bio = 'Updated bio';
      await user.save();

      const updatedUser = await User.findById(user._id).select('+password');
      expect(updatedUser.password).toBe(originalHash);
    });
  });

  describe('User Methods', () => {
    let user;
    const password = 'testPassword123';

    beforeEach(async () => {
      user = await User.create({
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: password
      });
      // Reload user with password field
      user = await User.findById(user._id).select('+password');
    });

    it('should match correct password', async () => {
      const isMatch = await user.matchPassword(password);
      expect(isMatch).toBe(true);
    });

    it('should not match incorrect password', async () => {
      const isMatch = await user.matchPassword('wrongPassword');
      expect(isMatch).toBe(false);
    });

    it('should generate valid JWT token', () => {
      const token = user.getSignedJwtToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('Default Values', () => {
    it('should set default profile image', async () => {
      const user = await User.create({
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: 'testPassword123'
      });

      expect(user.profileImage).toBe('default-profile.jpg');
    });

    it('should set createdAt timestamp', async () => {
      const before = Date.now();
      
      const user = await User.create({
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: 'testPassword123'
      });

      const after = Date.now();
      
      expect(user.createdAt).toBeDefined();
      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(after);
    });
  });
});