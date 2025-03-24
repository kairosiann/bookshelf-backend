const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Protect routes
exports.protect = async (req, res, next) => {
	let token;

	// Check if auth header exists and starts with Bearer
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		// Extract token from Bearer token
		token = req.headers.authorization.split(' ')[1];
	}

	// Check if token exists
	if (!token) {
		return res.status(401).json({
		success: false,
		message: 'Not authorized to access this route'
		});
	}

	try {
		// Verify token
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Add user to request object
		req.user = await User.findById(decoded.id);
		
		// If user no longer exists
		if (!req.user) {
		return res.status(401).json({
			success: false,
			message: 'User no longer exists'
		});
		}

		next();
	} catch (error) {
		return res.status(401).json({
			success: false,
			message: 'Not authorized to access this route',
			error: error.message
		});
	}
};