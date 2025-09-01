const BlogPost = require('../models/Blog');

// Get all blog posts
exports.getAllBlogPosts = async (req, res) => {
    try {
        const posts = await BlogPost.findAll();
        res.json(posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
        res.status(500).json({ message: 'Error getting blog posts', error: error.message });
    }
};

// Get a single blog post by ID
exports.getBlogPostById = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: 'Error getting blog post', error: error.message });
    }
};

// Create a new blog post
exports.createBlogPost = async (req, res) => {
    try {
        const { title, content, author } = req.body;
        if (!title || !content || !author) {
            return res.status(400).json({ message: 'Title, content, and author are required' });
        }
        const newPost = new BlogPost(title, content, author);
        await newPost.save();
        res.status(201).json({ message: 'Blog post created successfully', post: newPost });
    } catch (error) {
        res.status(500).json({ message: 'Error creating blog post', error: error.message });
    }
};

// Update a blog post
exports.updateBlogPost = async (req, res) => {
    try {
        const { title, content, author } = req.body;
        const updatedPost = await BlogPost.update(req.params.id, { title, content, author });
        if (!updatedPost) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        res.json({ message: 'Blog post updated successfully', post: updatedPost });
    } catch (error) {
        res.status(500).json({ message: 'Error updating blog post', error: error.message });
    }
};

// Delete a blog post
exports.deleteBlogPost = async (req, res) => {
    try {
        const success = await BlogPost.delete(req.params.id);
        if (!success) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        res.json({ message: 'Blog post deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting blog post', error: error.message });
    }
};
