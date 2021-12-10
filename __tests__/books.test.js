/** Integration tests for books route */

process.env.NODE_ENV = 'test';

const request = require('supertest');

const app = require('../app');
const db = require('../db');

// isbn of test book
let book_isbn;

beforeEach(async () => {
	let result = await db.query(`
      INSERT INTO
        books (isbn, amazon_url,author,language,pages,publisher,title,year)
        VALUES(
          '999999999',
          'https://amazon.com/couperin',
          'Francois Couperin',
          'french',
          999,
          'French Baroque Masters',
          'The Mysterious Barricades', 2020)
        RETURNING isbn`);

	book_isbn = result.rows[0].isbn;
});

describe('GET /books', function() {
	test('Gets a list containing 1 test book', async function() {
		const response = await request(app).get(`/books`);
		const books = response.body.books;
		expect(books).toHaveLength(1);
		expect(books[0]).toHaveProperty('isbn');
		expect(books[0]).toHaveProperty('amazon_url');
	});
});

describe('GET /books/:isbn', function() {
	test('Gets a single book', async function() {
		const response = await request(app).get(`/books/${book_isbn}`);
		expect(response.body.book).toHaveProperty('isbn');
		expect(response.body.book.isbn).toBe(book_isbn);
	});

	test("Responds with 404 if can't find book in question", async function() {
		const response = await request(app).get(`/books/9999`);
		expect(response.statusCode).toBe(404);
	});
});

describe('POST /books', function() {
	test('Creates a new book', async function() {
		const response = await request(app).post(`/books`).send({
			isbn: '8675309',
			amazon_url: 'https://amazon.com/test',
			author: 'Balzac',
			language: 'english',
			pages: 500,
			publisher: 'Music Man Ltd.',
			title: 'Iowa Stubborn Dames',
			year: 1910
		});
		expect(response.statusCode).toBe(201);
		expect(response.body.book).toHaveProperty('isbn');
	});

	test('Fail to create book, missing title', async function() {
		const response = await request(app).post(`/books`).send({ year: 2000 });
		expect(response.statusCode).toBe(400);
	});
});

describe('PUT /books/:id', function() {
	test('Updates a book', async function() {
		const response = await request(app).put(`/books/${book_isbn}`).send({
			amazon_url: 'https://amazon.com/morefun',
			author: 'Isaac Asimov',
			language: 'german',
			pages: 1000,
			publisher: 'Foundation Ltd',
			title: 'Updated Book',
			year: 2000
		});
		expect(response.body.book).toHaveProperty('isbn');
		expect(response.body.book.title).toBe('Updated Book');
	});

	test('Prevents a bad book update', async function() {
		const response = await request(app).put(`/books/${book_isbn}`).send({
			isbn: '86753909',
			badField: 'Non-existant field',
			amazon_url: 'https://amazon.com/morefun',
			author: 'Isaac Asimov',
			language: 'german',
			pages: 1000,
			publisher: 'Foundation Ltd',
			title: 'Updated Book',
			year: 2000
		});
		expect(response.statusCode).toBe(400);
	});

	test('Responds 404 if book does not exist', async function() {
		// delete book first
		await request(app).delete(`/books/${book_isbn}`);
		const response = await request(app).delete(`/books/${book_isbn}`);
		expect(response.statusCode).toBe(404);
	});

	test('Responds 404 if book does not exist', async function() {
		const response = await request(app).put(`/books/9999`).send({
			isbn: '86753909',
			badField: 'Non-existant field',
			amazon_url: 'https://amazon.com/morefun',
			author: 'Isaac Asimov',
			language: 'german',
			pages: 1000,
			publisher: 'Foundation Ltd',
			title: 'Updated Book',
			year: 2000
		});
		expect(response.statusCode).toBe(400);
	});
});

describe('DELETE /books/:id', function() {
	test('Deletes a book', async function() {
		const response = await request(app).delete(`/books/${book_isbn}`);
		expect(response.body).toEqual({ message: 'Book deleted' });
	});

	test('Responds 404 if book does not exist', async function() {
		// delete book first
		await request(app).delete(`/books/${book_isbn}`);
		const response = await request(app).delete(`/books/${book_isbn}`);
		expect(response.statusCode).toBe(404);
	});
});

afterEach(async function() {
	await db.query('DELETE FROM BOOKS');
});

afterAll(async function() {
	await db.end();
});
