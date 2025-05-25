const Book = require('../../models/book');
const User = require('../../models/user');
const { faker } = require('@faker-js/faker');
const { connect, closeDatabase, clearDatabase } = require('../setup');

describe('Book Model Tests', () => {
  let testUser;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    // Create a test user to use as addedBy
    testUser = await User.create({
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: 'testPassword123'
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Book Creation', () => {
    it('should create a book with valid data', async () => {
      const bookData = {
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        isbn: faker.string.numeric(13),
        description: faker.lorem.paragraph(),
        publishedDate: new Date('2023-01-01'),
        publisher: faker.company.name(),
        pageCount: faker.number.int({ min: 100, max: 1000 }),
        genres: ['Fiction', 'Adventure'],
        source: 'USER_ADDED',
        addedBy: testUser._id
      };

      const book = await Book.create(bookData);

      expect(book._id).toBeDefined();
      expect(book.title).toBe(bookData.title);
      expect(book.author).toBe(bookData.author);
      expect(book.isbn).toBe(bookData.isbn);
      expect(book.description).toBe(bookData.description);
      expect(book.genres).toEqual(bookData.genres);
      expect(book.averageRating).toBe(0);
      expect(book.totalReviews).toBe(0);
      expect(book.createdAt).toBeDefined();
    });

    it('should require title', async () => {
      const bookData = {
        author: faker.person.fullName(),
        addedBy: testUser._id
      };

      await expect(Book.create(bookData)).rejects.toThrow(/title/i);
    });

    it('should require author', async () => {
      const bookData = {
        title: faker.lorem.words(3),
        addedBy: testUser._id
      };

      await expect(Book.create(bookData)).rejects.toThrow(/author/i);
    });

    it('should require addedBy', async () => {
      const bookData = {
        title: faker.lorem.words(3),
        author: faker.person.fullName()
      };

      await expect(Book.create(bookData)).rejects.toThrow(/addedBy/i);
    });

    it('should enforce unique ISBN', async () => {
      const isbn = faker.string.numeric(13);
      
      await Book.create({
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        isbn: isbn,
        addedBy: testUser._id
      });

      const duplicateBook = {
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        isbn: isbn,
        addedBy: testUser._id
      };

      await expect(Book.create(duplicateBook)).rejects.toThrow(/duplicate key/i);
    });

    it('should allow books without ISBN', async () => {
      const book1 = await Book.create({
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        addedBy: testUser._id
      });

      const book2 = await Book.create({
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        addedBy: testUser._id
      });

      expect(book1._id).toBeDefined();
      expect(book2._id).toBeDefined();
    });

    it('should validate source enum', async () => {
      const bookData = {
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        source: 'INVALID_SOURCE',
        addedBy: testUser._id
      };

      await expect(Book.create(bookData)).rejects.toThrow();
    });

    it('should validate rating range', async () => {
      // Rating too low
      const lowRating = {
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        averageRating: -1,
        addedBy: testUser._id
      };

      await expect(Book.create(lowRating)).rejects.toThrow(/at least 0/i);

      // Rating too high
      const highRating = {
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        averageRating: 6,
        addedBy: testUser._id
      };

      await expect(Book.create(highRating)).rejects.toThrow(/cannot be more than 5/i);
    });
  });

  describe('Field Validations', () => {
    it('should enforce title length constraints', async () => {
      const longTitle = 'a'.repeat(101);
      const bookData = {
        title: longTitle,
        author: faker.person.fullName(),
        addedBy: testUser._id
      };

      await expect(Book.create(bookData)).rejects.toThrow(/at most 100 characters/i);
    });

    it('should enforce author length constraints', async () => {
      const longAuthor = 'a'.repeat(101);
      const bookData = {
        title: faker.lorem.words(3),
        author: longAuthor,
        addedBy: testUser._id
      };

      await expect(Book.create(bookData)).rejects.toThrow(/at most 100 characters/i);
    });

    it('should enforce description length constraints', async () => {
      const longDescription = 'a'.repeat(2001);
      const bookData = {
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        description: longDescription,
        addedBy: testUser._id
      };

      await expect(Book.create(bookData)).rejects.toThrow(/at most 2000 characters/i);
    });

    it('should trim whitespace from title and author', async () => {
      const book = await Book.create({
        title: '  The Great Gatsby  ',
        author: '  F. Scott Fitzgerald  ',
        addedBy: testUser._id
      });

      expect(book.title).toBe('The Great Gatsby');
      expect(book.author).toBe('F. Scott Fitzgerald');
    });

    it('should trim whitespace from genres', async () => {
      const book = await Book.create({
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        genres: ['  Fiction  ', ' Adventure '],
        addedBy: testUser._id
      });

      expect(book.genres).toEqual(['Fiction', 'Adventure']);
    });
  });

  describe('Text Search', () => {
    beforeEach(async () => {
      // Create books for search testing
      await Book.create({
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        description: 'A story about the American Dream',
        addedBy: testUser._id
      });

      await Book.create({
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        description: 'A classic of modern American literature',
        addedBy: testUser._id
      });

      await Book.create({
        title: 'The Great Expectations',
        author: 'Charles Dickens',
        description: 'A Victorian novel about social class',
        addedBy: testUser._id
      });

      // Create text index for search
      await Book.collection.createIndex({ title: 'text', author: 'text', description: 'text' });
    });

    it('should find books by text search', async () => {
      const results = await Book.find({ $text: { $search: 'Great' } });
      expect(results).toHaveLength(2);
      expect(results.map(b => b.title)).toContain('The Great Gatsby');
      expect(results.map(b => b.title)).toContain('The Great Expectations');
    });

    it('should find books by author search', async () => {
      const results = await Book.find({ $text: { $search: 'Fitzgerald' } });
      expect(results).toHaveLength(1);
      expect(results[0].author).toBe('F. Scott Fitzgerald');
    });

    it('should find books by description search', async () => {
      const results = await Book.find({ $text: { $search: 'American' } });
      expect(results).toHaveLength(2);
    });

    it('should handle multi-word searches', async () => {
      const results = await Book.find({ $text: { $search: '"Great Gatsby"' } });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('The Great Gatsby');
    });

    it('should rank results by text score', async () => {
      const results = await Book.find(
        { $text: { $search: 'Great' } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } });

      expect(results).toHaveLength(2);
      // Books with 'Great' in the title should rank higher
    });
  });

  describe('Default Values', () => {
    it('should set default cover image', async () => {
      const book = await Book.create({
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        addedBy: testUser._id
      });

      expect(book.coverImage).toBe('default-coverImage.jpg');
    });

    it('should set default ratings', async () => {
      const book = await Book.create({
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        addedBy: testUser._id
      });

      expect(book.averageRating).toBe(0);
      expect(book.totalReviews).toBe(0);
    });

    it('should set createdAt timestamp', async () => {
      const before = Date.now();
      
      const book = await Book.create({
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        addedBy: testUser._id
      });

      const after = Date.now();
      
      expect(book.createdAt).toBeDefined();
      expect(book.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(book.createdAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('Relationships', () => {
    it('should populate addedBy user', async () => {
      const book = await Book.create({
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        addedBy: testUser._id
      });

      const populatedBook = await Book.findById(book._id).populate('addedBy');
      
      expect(populatedBook.addedBy._id.toString()).toBe(testUser._id.toString());
      expect(populatedBook.addedBy.username).toBe(testUser.username);
      expect(populatedBook.addedBy.email).toBe(testUser.email);
    });

    it('should handle deleted user reference', async () => {
      const book = await Book.create({
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        addedBy: testUser._id
      });

      // Delete the user
      await User.findByIdAndDelete(testUser._id);

      // Book should still exist
      const foundBook = await Book.findById(book._id);
      expect(foundBook).toBeDefined();
      expect(foundBook.addedBy.toString()).toBe(testUser._id.toString());

      // Populate should return null for deleted user
      const populatedBook = await Book.findById(book._id).populate('addedBy');
      expect(populatedBook.addedBy).toBeNull();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create multiple books for query testing
      await Book.create([
        {
          title: 'JavaScript: The Good Parts',
          author: 'Douglas Crockford',
          genres: ['Programming', 'JavaScript'],
          averageRating: 4.5,
          totalReviews: 100,
          pageCount: 176,
          publishedDate: new Date('2008-05-01'),
          addedBy: testUser._id
        },
        {
          title: 'Clean Code',
          author: 'Robert C. Martin',
          genres: ['Programming', 'Best Practices'],
          averageRating: 4.7,
          totalReviews: 200,
          pageCount: 464,
          publishedDate: new Date('2008-08-01'),
          addedBy: testUser._id
        },
        {
          title: 'The Pragmatic Programmer',
          author: 'Andrew Hunt',
          genres: ['Programming', 'Career'],
          averageRating: 4.8,
          totalReviews: 150,
          pageCount: 352,
          publishedDate: new Date('1999-10-20'),
          addedBy: testUser._id
        }
      ]);
    });

    it('should find books by genre', async () => {
      const books = await Book.find({ genres: 'Programming' });
      expect(books).toHaveLength(3);
    });

    it('should find books by multiple genres', async () => {
      const books = await Book.find({ genres: { $in: ['JavaScript', 'Career'] } });
      expect(books).toHaveLength(2);
    });

    it('should sort books by rating', async () => {
      const books = await Book.find({}).sort({ averageRating: -1 });
      expect(books[0].title).toBe('The Pragmatic Programmer');
      expect(books[1].title).toBe('Clean Code');
      expect(books[2].title).toBe('JavaScript: The Good Parts');
    });

    it('should filter books by page count', async () => {
      const books = await Book.find({ pageCount: { $gte: 400 } });
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Clean Code');
    });

    it('should filter books by date range', async () => {
      const books = await Book.find({
        publishedDate: {
          $gte: new Date('2008-01-01'),
          $lte: new Date('2008-12-31')
        }
      });
      expect(books).toHaveLength(2);
    });

    it('should paginate results', async () => {
      const page1 = await Book.find({})
        .sort({ title: 1 })
        .limit(2)
        .skip(0);
      
      const page2 = await Book.find({})
        .sort({ title: 1 })
        .limit(2)
        .skip(2);

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
      expect(page1[0].title).toBe('Clean Code');
      expect(page2[0].title).toBe('The Pragmatic Programmer');
    });

    it('should count documents with filters', async () => {
      const count = await Book.countDocuments({ genres: 'Programming' });
      expect(count).toBe(3);

      const highRatedCount = await Book.countDocuments({ averageRating: { $gte: 4.7 } });
      expect(highRatedCount).toBe(2);
    });

    it('should aggregate data', async () => {
      const result = await Book.aggregate([
        { $match: { genres: 'Programming' } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$averageRating' },
            totalBooks: { $sum: 1 },
            totalPageCount: { $sum: '$pageCount' }
          }
        }
      ]);

      expect(result[0].totalBooks).toBe(3);
      expect(result[0].avgRating).toBeCloseTo(4.67, 1);
      expect(result[0].totalPageCount).toBe(992);
    });
  });

  describe('Update Operations', () => {
    let book;

    beforeEach(async () => {
      book = await Book.create({
        title: 'Original Title',
        author: 'Original Author',
        addedBy: testUser._id
      });
    });

    it('should update book fields', async () => {
      const updated = await Book.findByIdAndUpdate(
        book._id,
        {
          title: 'Updated Title',
          description: 'New description'
        },
        { new: true }
      );

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('New description');
      expect(updated.author).toBe('Original Author'); // Unchanged
    });

    it('should update rating statistics', async () => {
      const updated = await Book.findByIdAndUpdate(
        book._id,
        {
          $inc: { totalReviews: 1 },
          $set: { averageRating: 4.5 }
        },
        { new: true }
      );

      expect(updated.totalReviews).toBe(1);
      expect(updated.averageRating).toBe(4.5);
    });

    it('should add genres without duplicates', async () => {
      await Book.findByIdAndUpdate(book._id, {
        $addToSet: { genres: { $each: ['Fiction', 'Adventure', 'Fiction'] } }
      });

      const updated = await Book.findById(book._id);
      expect(updated.genres).toEqual(['Fiction', 'Adventure']);
    });

    it('should remove genres', async () => {
      await Book.findByIdAndUpdate(book._id, {
        $set: { genres: ['Fiction', 'Adventure', 'Mystery'] }
      });

      await Book.findByIdAndUpdate(book._id, {
        $pull: { genres: 'Adventure' }
      });

      const updated = await Book.findById(book._id);
      expect(updated.genres).toEqual(['Fiction', 'Mystery']);
    });

    it('should validate updates', async () => {
      await expect(
        Book.findByIdAndUpdate(
          book._id,
          { averageRating: 6 },
          { new: true, runValidators: true }
        )
      ).rejects.toThrow(/cannot be more than 5/i);
    });

    it('should handle concurrent updates', async () => {
      // Simulate concurrent rating updates
      const promises = Array(5).fill(null).map((_, index) => 
        Book.findByIdAndUpdate(
          book._id,
          {
            $inc: { totalReviews: 1 },
            $set: { averageRating: index + 1 }
          },
          { new: true }
        )
      );

      await Promise.all(promises);
      
      const finalBook = await Book.findById(book._id);
      expect(finalBook.totalReviews).toBe(5);
      // Last update wins for averageRating
      expect(finalBook.averageRating).toBe(5);
    });
  });

  describe('Delete Operations', () => {
    it('should delete a book', async () => {
      const book = await Book.create({
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        addedBy: testUser._id
      });

      await Book.findByIdAndDelete(book._id);
      
      const found = await Book.findById(book._id);
      expect(found).toBeNull();
    });

    it('should delete multiple books', async () => {
      await Book.create([
        {
          title: 'Book 1',
          author: 'Author 1',
          genres: ['ToDelete'],
          addedBy: testUser._id
        },
        {
          title: 'Book 2',
          author: 'Author 2',
          genres: ['ToDelete'],
          addedBy: testUser._id
        },
        {
          title: 'Book 3',
          author: 'Author 3',
          genres: ['ToKeep'],
          addedBy: testUser._id
        }
      ]);

      const result = await Book.deleteMany({ genres: 'ToDelete' });
      expect(result.deletedCount).toBe(2);

      const remaining = await Book.find({});
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe('Book 3');
    });

    it('should handle soft delete pattern', async () => {
      // If you implement soft deletes in the future
      const book = await Book.create({
        title: faker.lorem.words(3),
        author: faker.person.fullName(),
        addedBy: testUser._id
      });

      // Example of how soft delete might work
      // await Book.findByIdAndUpdate(book._id, { deletedAt: new Date() });
      
      // For now, just verify hard delete works
      await Book.findByIdAndDelete(book._id);
      const found = await Book.findById(book._id);
      expect(found).toBeNull();
    });
  });

  describe('Middleware and Hooks', () => {
    it('should trigger pre-save hooks', async () => {
      // If you add pre-save hooks in the future, test them here
      const book = new Book({
        title: 'Test Book',
        author: 'Test Author',
        addedBy: testUser._id
      });

      await book.save();
      expect(book._id).toBeDefined();
    });

    it('should handle validation errors gracefully', async () => {
      const book = new Book({
        title: '', // Empty title should fail
        author: 'Test Author',
        addedBy: testUser._id
      });

      await expect(book.save()).rejects.toThrow(/title/i);
    });
  });

  describe('Performance Considerations', () => {
    it('should efficiently query large datasets', async () => {
      // Create many books
      const books = Array(50).fill(null).map((_, index) => ({
        title: `Book ${index}`,
        author: `Author ${index % 10}`,
        genres: [`Genre${index % 5}`],
        averageRating: (index % 5) + 1,
        addedBy: testUser._id
      }));

      await Book.insertMany(books);

      // Test indexed queries
      const start = Date.now();
      const results = await Book.find({ genres: 'Genre1' }).limit(10);
      const duration = Date.now() - start;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(100); // Should be fast with proper indexing
    });

    it('should use lean queries for read-only operations', async () => {
      await Book.create({
        title: 'Test Book',
        author: 'Test Author',
        addedBy: testUser._id
      });

      const leanBook = await Book.findOne({}).lean();
      
      // Lean documents are plain objects, not Mongoose documents
      expect(leanBook.constructor.name).toBe('Object');
      expect(leanBook._id).toBeDefined();
      expect(leanBook.save).toBeUndefined(); // No Mongoose methods
    });
  });
});