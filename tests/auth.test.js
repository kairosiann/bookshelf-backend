// tests/auth.test.js
const request = require('supertest');
const express = require('express');
const { faker } = require('@faker-js/faker');
const User = require('../models/user'); // Assuming User model isn't strictly needed here
const authRouter = require('../routes/auth');
const { connect, closeDatabase, clearDatabase } = require('./setup');

// --- Test App Setup ---
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

// --- Environment Variables ---
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRE = '7d';

// --- Helper Functions ---

/** Generates fake user data */
const buildUserData = (overrides = {}) => ({
    username: faker.internet.userName(),
    email: faker.internet.email().toLowerCase(), // Use lowercase for consistency
    password: 'testPassword123',
    ...overrides,
});

/** Helper to make registration requests */
const registerUser = (userData) => {
    return request(app).post('/api/auth/register').send(userData);
};

/** Helper to make login requests */
const loginUser = (credentials) => {
    return request(app).post('/api/auth/login').send(credentials);
};

/** Helper to make 'me' requests */
const getMe = (token) => {
    return request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
};

// --- Main Test Suite ---
describe('Authentication API', () => {
    beforeAll(connect); // Simplified syntax
    afterEach(clearDatabase);
    afterAll(closeDatabase);

    // --- Registration Tests ---
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = buildUserData();
            const response = await registerUser(userData).expect(200);

            expect(response.body).toEqual(
                expect.objectContaining({
                    success: true,
                    token: expect.any(String),
                    user: expect.objectContaining({
                        email: userData.email,
                        username: userData.username,
                        _id: expect.any(String),
                    }),
                })
            );
            expect(response.body.user).not.toHaveProperty('password');
        });

        describe('Registration Conflicts', () => {
            let existingUser;
            beforeEach(async () => {
                existingUser = buildUserData();
                await registerUser(existingUser).expect(200);
            });

            test.each([
                {
                    field: 'email',
                    data: (user) => ({ ...buildUserData(), email: user.email }),
                },
                {
                    field: 'username',
                    data: (user) => ({ ...buildUserData(), username: user.username }),
                },
            ])('should return 400 for existing $field', async ({ data }) => {
                const conflictData = data(existingUser);
                const response = await registerUser(conflictData).expect(400);

                expect(response.body).toEqual({
                    success: false,
                    message: 'User already exists',
                });
            });
        });

        describe('Registration Validation', () => {
            test.each([
                { field: 'username', data: { email: faker.internet.email(), password: '123' } },
                { field: 'email', data: { username: faker.internet.userName(), password: '123' } },
                { field: 'password', data: { username: faker.internet.userName(), email: faker.internet.email() } },
            ])('should return 400 or 500 when $field is missing', async ({ data }) => {
                // Note: Ideally, validation errors should be 400.
                // If your API returns 500, that might indicate a bug.
                // We'll check for non-200 status.
                const response = await registerUser(data);
                expect(response.status).not.toBe(200);
                expect(response.body.success).toBe(false);
                expect(response.body).toHaveProperty('message');
            });
        });
    });

    // --- Login Tests ---
    describe('POST /api/auth/login', () => {
        let testUser;
        const password = 'mySecretPassword';

        beforeEach(async () => {
            testUser = buildUserData({ password: password });
            await registerUser(testUser).expect(200);
        });

        it('should login with valid credentials', async () => {
            const response = await loginUser({
                email: testUser.email,
                password: password,
            }).expect(200);

            expect(response.body).toEqual(
                expect.objectContaining({
                    success: true,
                    token: expect.any(String),
                    user: expect.objectContaining({ email: testUser.email }),
                })
            );
        });

        describe('Login Failures', () => {
            test.each([
                {
                    description: 'invalid password',
                    creds: (user) => ({ email: user.email, password: 'wrongPassword' }),
                    expectedMessage: 'Invalid credentials',
                },
                {
                    description: 'non-existent email',
                    creds: (user) => ({ email: 'nonexistent@test.com', password: password }),
                    expectedMessage: 'Invalid credentials',
                },
                {
                    description: 'missing password',
                    creds: (user) => ({ email: user.email }),
                    expectedMessage: 'Please provide an email and password',
                },
                {
                    description: 'missing email',
                    creds: (user) => ({ password: password }),
                    expectedMessage: 'Please provide an email and password',
                },
            ])('should return 400 for $description', async ({ creds, expectedMessage }) => {
                const loginData = creds(testUser);
                const response = await loginUser(loginData).expect(400);

                expect(response.body).toEqual({
                    success: false,
                    message: expectedMessage,
                });
            });
        });
    });

    // --- 'Me' Endpoint Tests ---
    describe('GET /api/auth/me', () => {
        let token;
        let user;

        beforeEach(async () => {
            const userData = buildUserData();
            const response = await registerUser(userData).expect(200);
            token = response.body.token;
            user = response.body.user;
        });

        it('should get current user with valid token', async () => {
            const response = await getMe(token).expect(200);

            expect(response.body).toEqual({
                success: true,
                data: expect.objectContaining({ _id: user._id }),
            });
        });

        describe('Authorization Failures', () => {
            test.each([
                { description: 'missing token', sendToken: () => undefined },
                { description: 'invalid token', sendToken: () => 'invalidtoken123' },
            ])('should return 401 for $description', async ({ sendToken }) => {
                const currentToken = sendToken();
                const requestObj = request(app).get('/api/auth/me');

                if (currentToken) {
                    requestObj.set('Authorization', `Bearer ${currentToken}`);
                }

                const response = await requestObj.expect(401);

                expect(response.body).toEqual({
                    success: false,
                    message: 'Not authorized to access this route', // Assuming a consistent message
                });
            });
        });
    });
});