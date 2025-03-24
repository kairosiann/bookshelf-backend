const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Defining the User Schema
const UserSchema = new mongoose.Schema({
	username: {
		type: String,
		required: [true, "Please provide a username"],
		unique: true,
		trim: true,
		minlength: [2, "Username must be at least 2 characters long"],
		maxlength: [20, "Username must be at most 20 characters long"],
	},
	email: {
		type: String,
		required: [true, "Please provide an email"],
		unique: true,
		match: [
			/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
			"Please provide a valid email",
		],
	},
	password: {
		type: String, 
		required: [true, "Please provide a password"],
		minlength: [2, "Password must be at least 2 characters long"],
		select: false,
	},
	profileImage: {
		type: String,
		default: "default-profile.jpg"
	},
	bio: {
		type: String,
		maxlength: [100, "Bio must be at most 100 characters long"],
	},
	createdAt: {
		type: Date,
		default: Date.now,
	}
});

// Encrypt password before saving
UserSchema.pre("save", async function(next) {
	if (!this.isModified("password")) {
		next();
	}

	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
});

// Generate JWT token, get them signed, and returned
UserSchema.methods.getSignedJwtToken = function() {
	return jwt.sign({ id: this._id }, 
		process.env.JWT_SECRET, 
		{
			expiresIn: process.env.JWT_EXPIRE,
		}
	);
};
