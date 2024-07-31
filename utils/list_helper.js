const _ = require('lodash')
const logger = require('./logger')

const dummy = (blogs) => {
    return 1
}

const totalLikes = (blogs) => {
    // use reduce to return the sum of likes of all blogs
    return blogs.reduce((sum, blog) => sum + blog.likes, 0)
}

const favoriteBlog = (blogs) => {
    // use sort to sort the blogs based on likes, then return the first one
    blogs.sort((a, b) => b.likes - a.likes)
    return blogs[0]
}

const mostBlogs = (blogs) => {
    // use countBy to get each author's number of occurrences
    const authorsOccurrences = _.countBy(blogs, 'author')

    // use toPairs to parse key-value pairs into array pairs
    // use maxBy to return the author with the most blogs
    const maxAuthor = _.maxBy(_.toPairs(authorsOccurrences), ([author, noOfBlogs]) => noOfBlogs)
    const [author, noOfBlogs] = maxAuthor

    return {
        author: author,
        blogs: noOfBlogs
    }
}

const mostLikes = (blogs) => {
    // use groupBy to group blogs based on author
    const authorsGroups = _.groupBy(blogs, 'author')

    // use map and sumBy to return an array of authors and their number of likes
    const likesByAuthor = _.map(authorsGroups, (authorGroups, author) => ({
        author,
        likes: _.sumBy(authorGroups, 'likes')
    }))

    // use orderBy to sort by descending order based on likes, then return the top item
    return _.orderBy(likesByAuthor, ['likes'], ['desc'])[0]
}

module.exports = {
    dummy,
    totalLikes,
    favoriteBlog,
    mostBlogs,
    mostLikes
}