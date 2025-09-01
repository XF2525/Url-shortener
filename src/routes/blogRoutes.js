const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation middleware
const validateBlog = [
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required')
];

// Public routes
router.get('/blogs', blogController.getAllBlogs);
router.get('/blogs/:slug', blogController.getBlogBySlug);

// Protected routes
router.use(authenticate);

router.post('/blogs', validateBlog, blogController.createBlog);
router.put('/blogs/:id', validateBlog, blogController.updateBlog);
router.delete('/blogs/:id', blogController.deleteBlog);
router.post('/blogs/:id/like', blogController.likeBlog);
router.post('/blogs/:id/comment', blogController.addComment);

// Admin routes
router.get('/admin/blogs/stats', authorize('admin'), blogController.getBlogStats);

module.exports = router;
