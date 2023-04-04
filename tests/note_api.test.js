const mongoose = require('mongoose')
const supertest = require('supertest')
const helper = require('./test_helper')

const bcrypt = require('bcrypt')

const app = require('../app')
const api = supertest(app)

const Note = require('../models/note')
const User = require('../models/user')

// CODE FOR INITIALIZING THE DATABASE BEFORE TESTS

beforeEach(async () => {
	await Note.deleteMany({})
	await Note.insertMany(helper.initialNotes)
})

// TESTS

describe('when there is initially some notes saved', () => {

	test('notes are returned as json', async () => {
		await api
			.get('/api/notes')
			.expect(200)
			.expect('Content-Type', /application\/json/)
	}, 100000)

	test('all notes are returned', async () => {
		const response = await api.get('/api/notes')
		const returnedNotes = response.body
		expect(returnedNotes).toHaveLength(helper.initialNotes.length)
	}, 100000)

	test('a specific note is within the returned notes', async () => {
		const response = await api.get('/api/notes')
		const contents = response.body.map(r => r.content)
		expect(contents).toContain(
			'Browser can execute only JavaScript'
		)
	}, 100000)

})


describe('viewing a specific note', () => {

	test('succeeds with a valid id', async () => {
		//get the first note directly from the database
		const notesAtStart = await helper.notesInDb()
		const noteToView = notesAtStart[0]
		//fetch that specific note via the api
		const response = await api
			.get(`/api/notes/${noteToView.id}`)
			.expect(200)
			.expect('Content-Type', /application\/json/)
		//verify that the note was returned as expected
		const returnedNote = response.body
		expect(returnedNote).toEqual(noteToView)
	})

	test('fails with statuscode 404 if note does not exist', async () => {
		const validButNonexistingId = await helper.nonExistingId()
		await api.get(`/api/notes/${validButNonexistingId}`)
			.expect(404)
	})

	test('fails with statuscode 400 if id is invalid', async () => {
		const invalidId = '5a3d5da59070081a82a3445'
		await api.get(`/api/notes/${invalidId}`)
			.expect(400)
	})

})


describe('addition of a new note', () => {

	test('succeeds with valid data', async () => {
		//define new note to add
		const newNote = {
			content: 'async/await simplifies making async calls',
			important: true
		}
		//add the note via the api
		await api.post('/api/notes').send(newNote)
			.expect(201)
			.expect('Content-Type', /application\/json/)
		//verify note was added to database
		const notesAtEnd = await helper.notesInDb()
		expect(notesAtEnd).toHaveLength(helper.initialNotes.length + 1)
		const contents = notesAtEnd.map(r => r.content)
		expect(contents).toContain(
			'async/await simplifies making async calls'
		)
	}, 100000)

	test('fails with statuscode 400 if there is no content property', async () => {
		const invalidNote = {
			important: true
		}
		await api
			.post('/api/notes')
			.send(invalidNote)
			.expect(400)
		//verify invalid note was not added
		const notesAtEnd = await helper.notesInDb()
		expect(notesAtEnd).toHaveLength(helper.initialNotes.length)
	})

})

describe('deletion of a note', () => {

	test('succeeds with statuscode 204 if id is valid', async () => {
		const notesAtStart = await helper.notesInDb()
		//delete a note via the api
		const noteToDelete = notesAtStart[0]
		await api
			.delete(`/api/notes/${noteToDelete.id}`)
			.expect(204)
		//verify that the note was deleted from the database
		const notesAtEnd = await helper.notesInDb()
		expect(notesAtEnd).toHaveLength(helper.initialNotes.length - 1)
		const contents = notesAtEnd.map(r => r.content)
		expect(contents).not.toContain(noteToDelete.content)
	})

})


describe('when there is initially one user in DB', () => {

	beforeEach(async () => {
		await User.deleteMany({})

		const passwordHash = await bcrypt.hash('sekret', 10)
		const user = new User({ username: 'root', passwordHash })

		await user.save()
	})


	test('creation succeeds with a fresh username', async () => {
		const usersAtStart = await helper.usersInDb()

		const newUser = {
			username: 'mluukkai',
			name: 'Matti Luukkainen',
			password: 'salainen',
		}

		await api.post('/api/users').send(newUser)
			.expect(201)
			.expect('Content-Type', /application\/json/)

		const usersAtEnd = await helper.usersInDb()
		expect(usersAtEnd).toHaveLength(usersAtStart.length + 1)

		const usernames = usersAtEnd.map(user => user.username)
		expect(usernames).toContain(newUser.username)
	})


	test('creation fails with proper statuscode and message if username is already taken', async () => {
		const usersAtStart = await helper.usersInDb()

		const newUser = {
			username: 'root',
			name: 'Superuser',
			password: 'salainen',
		}

		const result = await api.post('/api/users').send(newUser)
			.expect(400)
			.expect('Content-Type', /application\/json/)

		expect(result.body.error).toContain('expected `username` to be unique')

		const usersAtEnd = await helper.usersInDb()
		expect(usersAtEnd).toEqual(usersAtStart)
	})

})


afterAll(async () => {
	await mongoose.connection.close()
})