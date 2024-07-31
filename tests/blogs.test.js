const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { test, describe, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const mongoose = require('mongoose')
const listHelper = require('../utils/list_helper')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)

const Blog = require('../models/blog')
const User = require('../models/user')

test('dummy returns one', () => {
    const result = listHelper.dummy(helper.initialBlogs)
    assert.strictEqual(result, 1)
})

describe('total likes', () => {
    test('of empty list is zero', () => {
        assert.strictEqual(listHelper.totalLikes([]), 0)
    })

    test('when list has only one blog equals the likes of that', () => {
        assert.strictEqual(listHelper.totalLikes(helper.listWithOneBlog), 5)
    })

    test('of a bigger list is calculated right', () => {
        assert.strictEqual(listHelper.totalLikes(helper.initialBlogs), 36)
    })
})

describe('Most favorite blog', () => {
    test('is the blog with the most likes', () => {
        assert.deepStrictEqual(listHelper.favoriteBlog(helper.initialBlogs), {
            _id: "5a422b3a1b54a676234d17f9",
            title: "Canonical string reduction",
            author: "Edsger W. Dijkstra",
            url: "http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html",
            likes: 12,
            __v: 0
        })
    })
})

describe('Author with the most blogs', () => {
    test('in a big list is correctly extracted', () => {
        assert.deepStrictEqual(listHelper.mostBlogs(helper.initialBlogs), {
            author: "Robert C. Martin",
            blogs: 3
        })
    })
})

describe('Author with the most likes', () => {
    test('in a big list is correctly extracted', () => {
        assert.deepStrictEqual(listHelper.mostLikes(helper.initialBlogs), {
            author: "Edsger W. Dijkstra",
            likes: 17
        })
    })
})

describe('when there are initially some blogs saved', () => {
    beforeEach(async () => {
        await Blog.deleteMany({})
        await Blog.insertMany(helper.initialBlogs)
    })

    test('blogs are returned as json', async () => {
        await api
            .get('/api/blogs')
            .expect(200)
            .expect('Content-Type', /application\/json/)
    })

    test('all blogs are returned correctly', async () => {
        const response = await api.get('/api/blogs')
        assert.strictEqual(response.body.length, helper.initialBlogs.length)
    })

    test('blogs unique identifier property is named id', async () => {
        const blogs = await helper.blogsInDb()
        console.log(blogs)
        assert(blogs.every(blog => blog.hasOwnProperty('id')))
    })

    describe('addition of a new blog', () => {
        let user = {}
        let token = ''

        beforeEach(async () => {
            // get a user for tests
            const users = await User.find({})
            user = users[0]

            // create the user token ('root' user existed in mongodb)
            const userForToken = {
                username: user.username,
                id: user.id
            }

            // sign the token
            token = jwt.sign(
                userForToken,
                process.env.SECRET,
                { expiresIn: 60 * 60 }
            )
        })

        test('succeeds with valid data', async () => {
            const newBlog = {
                title: 'Generative AI and skills',
                author: 'BOB',
                url: 'https://randomtechthoughts.blog/2024/07/20/generative-ai/',
                user: user.id,
                likes: 0
            }

            await api
                .post('/api/blogs')
                .set('Authorization', `Bearer ${token}`)
                .send(newBlog)
                .expect(201)
                .expect('Content-Type', /application\/json/)

            const blogsAtEnd = await helper.blogsInDb()
            assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

            const titles = blogsAtEnd.map(b => b.title)
            assert(titles.includes('Generative AI and skills'))
        })

        test('without the likes property, likes is zero', async () => {
            const newBlog = {
                title: 'A Blog with no likes property',
                author: 'TTT',
                url: 'https://randomtechthoughts.blog/2024/07/20/a-blog-with-no-likes/',
                user: user.id
            }

            await api
                .post('/api/blogs')
                .set('Authorization', `Bearer ${token}`)
                .send(newBlog)
                .expect(201)
                .expect('Content-Type', /application\/json/)

            const blogsAtEnd = await helper.blogsInDb()
            assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

            const newSavedBlog = blogsAtEnd[blogsAtEnd.length - 1]
            assert(newSavedBlog.hasOwnProperty('likes'))
            assert.strictEqual(newSavedBlog.likes, 0)
        })

        test('fails with status code 400 if does not have title or url', async () => {
            const newBlog = {
                title: '',
                author: 'TTT',
                url: '',
                user: user.id,
                likes: 23
            }

            await api
                .post('/api/blogs')
                .set('Authorization', `Bearer ${token}`)
                .send(newBlog)
                .expect(400)

            const blogsAtEnd = await helper.blogsInDb()
            assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
        })

        test('fails with status code 401 if token is not provided', async () => {
            const newBlog = {
                title: 'Generative AI and skills',
                author: 'BOB',
                url: 'https://randomtechthoughts.blog/2024/07/20/generative-ai/',
                user: user.id,
                likes: 0
            }

            await api
                .post('/api/blogs')
                .send(newBlog)
                .expect(401)
                .expect('Content-Type', /application\/json/)

            const blogsAtEnd = await helper.blogsInDb()
            assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)

            const titles = blogsAtEnd.map(b => b.title)
            assert(!titles.includes('Generative AI and skills'))
        })
    })

    describe('deletion of a blog', () => {
        test('succeeds with status code 204 if id is valid', async () => {
            const blogsAtStart = await helper.blogsInDb()
            const blogToDelete = blogsAtStart[0]

            await api
                .delete(`/api/blogs/${blogToDelete.id}`)
                .expect(204)

            const blogsAtEnd = await helper.blogsInDb()
            assert.strictEqual(blogsAtEnd.length, blogsAtStart.length - 1)

            const titles = blogsAtEnd.map(b => b.title)
            assert(!titles.includes(blogToDelete.title))
        })
    })

    describe('updating a blog', () => {
        test('succeeds with valid data', async () => {
            const blogsAtStart = await helper.blogsInDb()
            const blogToUpdate = blogsAtStart[0]

            const updateInfo = {
                likes: 50
            }

            await api
                .put(`/api/blogs/${blogToUpdate.id}`)
                .send(updateInfo)
                .expect(200)

            const blogsAtEnd = await helper.blogsInDb()
            assert.strictEqual(blogsAtEnd.length, blogsAtStart.length)

            const updatedBlog = await Blog.findById(blogToUpdate.id)
            assert.strictEqual(updateInfo.likes, updatedBlog.likes)
        })
    })
})

describe('when there is initially at least one user in db', () => {
    beforeEach(async () => {
        await User.deleteMany({})

        // create a 'root' user
        const passwordHash = await bcrypt.hash('sekret', 10)
        const user = new User({
            username: 'root',
            name: 'root',
            passwordHash
        })

        await user.save()
    })

    test('creation succeeds with a fresh username', async () => {
        const usersAtStart = await helper.usersInDb()

        const newUser = {
            username: 'hellas',
            name: 'Arto Hellas',
            password: 'hellas'
        }

        await api
            .post('/api/users')
            .send(newUser)
            .expect(201)
            .expect('Content-Type', /application\/json/)

        const usersAtEnd = await helper.usersInDb()

        assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)
        const usernames = usersAtEnd.map(u => u.username)
        assert(usernames.includes(newUser.username))
    })

    test('creation fails with proper statuscode and message if username already taken', async () => {
        const usersAtStart = await helper.usersInDb()

        const newUser = {
            username: 'root',
            name: 'Similar root',
            password: 'sekret'
        }

        const result = await api
            .post('/api/users')
            .send(newUser)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        const usersAtEnd = await helper.usersInDb()

        assert(result.body.error.includes('expected `username` to be unique'))
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    test('creation fails with proper status code and message if username is less than 3 characters', async () => {
        const usersAtStart = await helper.usersInDb()

        const newUser = {
            username: 'iu',
            name: 'Invalid User',
            password: 'invalid'
        }

        const result = await api
            .post('/api/users')
            .send(newUser)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        const usersAtEnd = await helper.usersInDb()

        assert(result.body.error.includes('minimum allowed length (3)'))
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    test('creation fails with proper status code and message if password is less than 3 characters', async () => {
        const usersAtStart = await helper.usersInDb()

        const newUser = {
            username: 'invaliduser',
            name: 'Invalid User',
            password: 'iu'
        }

        const result = await api
            .post('/api/users')
            .send(newUser)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        const usersAtEnd = await helper.usersInDb()

        assert(result.body.error.includes('password must be at least 3 characters long'))
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })
})

after(async () => {
    await mongoose.connection.close()
})