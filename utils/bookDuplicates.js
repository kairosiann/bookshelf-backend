/** 
 * userAddedBooks.js
 * Written April 5th 2025 by Ryan Kim
 * 
 * Code looking for duplicate book entries
 */

exports.findPossibleDuplicates = async(book) => {
	let query = {};

	// if ISBN exists, use it to find duplictes (most reliable)
	if (book.isbn) {
		query.isbn = book.isbn;
	} else {
		// Otherwise compare title and author
		query = {
			title: { $regex: new RegExp(book.title.substring(0, 20), 'i') },
			author: { $regex: new RegExp(book.author.split('')[0], 'i') }
		};
	}

	return await book.find(query); // TODO: Book or book
};

exports.mergeBookData = (existingBook, newBookData) => {
	return {
		...existingBook,
		description: existingBook.description || newBookData.description,
		coverImage: existingBook.coverImage || newBookData.coverImage,
		publishedDate: existingBook.publishedDate || newBookData.publishedDate,
		publisher: existingBook.publisher || newBookData.publisher,
		pageCount: existingBook.pageCount || newBookData.pageCount,
		genres: existingBook.genres || newBookData.genres,
	};
};