const blogsRouter = require('express').Router()
const middleware = require('../utils/middleware')
const Blog = require('../models/blog')

blogsRouter.get('/', async (request, response) => {
    const blogs = await Blog
        .find({})
        .populate('user', { username: 1, name: 1 })

    response.json(blogs)
})

blogsRouter.post('/', middleware.userExtractor, async (request, response) => {
    const body = request.body

    // get user from the request object
    const user = request.user

    const blog = new Blog({
        url: body.url,
        title: body.title,
        author: body.author,
        user: user._id,
        likes: body.likes
    })

    const savedBlog = await blog.save()

    const populatedBlog = await savedBlog.populate('user', { username: 1, name: 1 })

    user.blogs = user.blogs.concat(populatedBlog._id)
    await user.save()

    response.status(201).json(populatedBlog)
})

blogsRouter.delete('/:id', middleware.userExtractor, async (request, response) => {
    // get user from the request object
    const user = request.user

    const blog = await Blog.findById(request.params.id)

    if (blog.user.toString() !== user.id) {
        return response.status(401).json({
            error: 'invalid user'
        })
    }

    await Blog.deleteOne(blog)

    // Delete blog from the user object
    user.blogs = user.blogs.filter(b => {
        return b.toString() !== blog.id
    })

    await user.save()

    response.status(204).end()
})

blogsRouter.put('/:id', async (request, response) => {
    const body = request.body

    const blog = {
        likes: body.likes
    }

    const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, { new: true })
    response.json(updatedBlog)
})

module.exports = blogsRouter