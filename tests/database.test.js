const mongoose = require('mongoose');
const connectDB = require('../config/database');
const { it } = require('node:test');

describe('Database Connection', () => {
	beforeEach(() => {
		process.env.MONGO_URI = 'mongodb://localhost:27017/bookshelf-test';
	});

	afterAll(async () => {
		await mongoose.connection.close();
	});

	it('should connect to the database', async () => {

		// Mock console.log to capture output
		const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
		
		// Attempt to connect to the database
		await connectDB();

		// Check if the connection was successful
		expect(mongoose.connection.readyState).toBe(1);

		// Clean up
		consoleLogSpy.mockRestore();
	});

	it('should handle connection errors', async () => {
		// Set invalid URI
		process.env.MONGO_URI = 'mongodb://invalid-uri';

		// Mock console.error and process.exit
		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
		const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
	
		// Attempt database connection
		await connectDB();

		// Check if error was logged
		expect(consoleErrorSpy).toHaveBeenCalled();
		expect(processExitSpy).toHaveBeenCalledWith(1);

		// Clean up
		consoleErrorSpy.mockRestore();
		processExitSpy.mockRestore();
	});
});