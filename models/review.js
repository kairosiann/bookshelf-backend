const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
	author: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
		required: true,
		index: true,
	},
	book: {
		type: mongoose.Schema.ObjectId,
		ref: "Book",
		required: true,
		index: true,
	},
	rating: {
		type: Number,
		min: [1, "Rating must be at least 1"],
		max: [5, "Rating cannot be more than 5"],
		required: [true, "Please provide a rating"],
	},
	review: {
		type: String,
		maxlength: [500, "Review must be at most 500 characters long"],
	},
	likes: [{
		type: mongoose.Schema.ObjectId,
		ref: "User",
	}],
	shares: [{
		// Tracking which users shared the review
		type: mongoose.Schema.ObjectId,
		ref: "User",
	}],
	likesCount: {
		type: Number,
		default: 0,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
}, {
	timestamps: true,
	toJSON: {virtuals: true},
	toObject: {virtuals: true}
});

// Updating likeCount
ReviewSchema.pre("save", function(next) {
	if (this.isModified("likes")) {
		this.likesCount = this.likes.length;
	}
	next();
});

// Handling likes and unlikes
ReviewSchema.methods.like = async function(userID) {
	if (this.likes.indexof(userID) === -1) {
		this.likes.push(userID);
		this.likesCount = this.likes.length;
		await this.save();
	}
};

ReviewSchema.methods.unlike = async function(userID) {
	const index = this.likes.indexOf(userID);
	if (index !== -1) {
		this.likes.splice(index, 1);
		this.likesCount = this.likes.length;
		await this.save();
	}
}

const Review = mongoose.model("Review", ReviewSchema);
module.exports = Review;

