/** 
 * userAddedBooks.js
 * Written April 1st 2025 by Ryan Kim
 * 
 * Code enabling user-submitted books (or other media such as blog posts) to be stored in the database.
 */

const book = require("../models/book");

exports.addBook = async(req, res) => {
	try {
		const bookData = req.body;

		// Checking that required information is in entry
		// TODO: Should we require users to upload cover images? How would that work for blogs though...
		if (!bookData.title || !bookData.author || !bookData.link) {
			return res.status(400).json({
				success: false,
				message: "Title, author, and source link are required"
			});
		}

		// Checking for duplicates
		const possibleDuplicate = await Book.findOne({
			title: { $regex: new RegExp('^' + bookData.title + '$', 'i') },
			author: { $regex: new RegExp('^' + bookData.author + '$', 'i') },
			link: { $regex: new RegExp('^' + bookData.link + '$', 'i') },
		});

		if (possibleDuplicate) {
			return res.status(400).json({
				success: false,
				message: "This book already exists in the database",
				data: possibleDuplicate
			});
		}

		// Add metadata
		bookData.source = 'USER_CONTRIBUTED';
		bookData.addedBy = req.user.id;
		bookData.verified = false;

		// Create book
		const book = await Book.create(bookData);

		res.status(201).json({
			success: true,
			data: book
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Error adding book',
			error: error.message
		});
	}
};