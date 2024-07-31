const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    author: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    likes: Number
})

// Default likes to 0, in case likes property is not given
blogSchema.path('likes').default(0)

blogSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

module.exports = mongoose.model('Blog', blogSchema)