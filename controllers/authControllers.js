const User = require("../models/user");

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
	try {
		const { username, email, password } = req.body;

		// Checking if user already exists
		const existingUser = await User.findOne({ $or : [{ email }, { username}] });
		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: "User already exists"
			});
		}

		// Create new user
		const user = await User.create( {
			username, email, password
		});
		
		sendTokenResponse(user, 200, res);
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: "Please provide an email and password to login"
			});
		}

		// Check if user exists
		const user = await User.findOne( {email}).select("+password");
	
		if (!user) {
			return res.status(400).json({
				success: false,
				message: "Invalid credentials"
			});
		}

		// Check if password is correct
		const isMatch = await user.matchPassword(password);
		if (!isMatch) {
			return res.status(400).json({
				success: false,
				message: "Invalid credentials"
			});
		}

		sendTokenResponse(user, 200, res);
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to log in",
			error: error.message
		});
	}
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
	try {
	  const user = await User.findById(req.user.id);
	  
	  res.status(200).json({
		success: true,
		data: user
	  });
	} catch (error) {
		res.status(500).json({
		success: false,
		message: 'Failed to get user data',
		error: error.message
	  });
	}
};
  
// Helper function to create token and send response
const sendTokenResponse = (user, statusCode, res) => {
	// Create token
	const token = user.getSignedJwtToken();

	// Remove password from output
	user.password = undefined;

	res.status(statusCode).json({
		success: true,
		token,
		user
	});
};