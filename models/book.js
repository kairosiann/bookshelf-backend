const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({
	title: {
		type: String,
		required: [true, "Please provide a book title"],
		trim: true,
		maxlength: [100, "Title must be at most 100 characters long"],
	},
	author: {
		type: String,
		required: [true, "Please provide an author name"],
		trim: true,
		maxlength: [100, "Author name must be at most 100 characters long"],
	},
	isbn: {
		type: String,
		trim: true,
		unique: true,
		sparse: true
	},
	coverImage: {
		type: String,
		default: "default-coverImage.jpg",
	}, 
	description: {
		type: String,
		maxlength: [2000, "Book description must be at most 2000 characters long"],
	},
	publishedDate: {
		type: Date
	},
	genres: [{
		type: String,
		trim: true
	}],
	addedBy: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	averageRating: {
		type: Number,
		min: [0, 'Rating must be at least 0'],
		max: [5, 'Rating cannot be more than 5'],
		default: 0
	},
	totalReviews: {
		type: Number,
		default: 0
	}
});

// Enabliing search functionality for seelected fields
BookSchema.index({title: "text", author: "text", description: "text"});

module.exports = mongoose.model("Book", BookSchema);