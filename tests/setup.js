const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer; 

// Connect to the in-memory database before running any tests
const connect = async () => {
	mongoServer = await MongoMemoryServer.create();
	const uri = mongoServer.getUri();

	await mongoose.connect(uri);

	console.log('Connected to in-memory MongoDB');
};

// Drop from database, close connection and stop mongoServer
const closeDatabase = async () => {
	await mongoose.connection.dropDatabase();
	await mongoose.connection.close();
	await mongoServer.stop();
	console.log('Disconnected from in-memory MongoDB');
}

// Clearing all test data after every test
const clearDatabase = async () => {
	const collections = mongoose.connection.collections;

	for (const key in collections) {
		await collections[key].deleteMany();
	}
	console.log('Cleared test data');
};

module.exports = {
	connect,
	closeDatabase,
	clearDatabase,
};