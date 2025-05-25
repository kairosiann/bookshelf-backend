const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
	text: {
		type: String,
		maxlength: [200, "Comment must be at most 200 characters long"],
		required: [true, "A comment requires text"],
		trim: true,
	},
	author: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
		required: true,
		index: true,
	},
	review: {
		type: mongoose.Schema.ObjectId,
		ref: "Review",
		required: true,
		index: true,
	}
}, {timestamps: true});

const Comment = mongoose.model("Comment", CommentSchema);
module.exports = Comment;