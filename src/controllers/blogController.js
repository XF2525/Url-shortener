const Blog = require('../models/Blog');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Create new blog post
exports.createBlog = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, category, tags, status, seo, featuredImage } = req.body;
    
    // Check for duplicate slug
    const existingBlog = await Blog.findOne({ 
      slug: req.body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-') 
    });
    
    if (existingBlog) {
      return res.status(400).json({ 
        error: 'A blog with this title/slug already exists' 
      });
    }

    const blog = new Blog({
      title,
      content,
      author: req.user._id,
      category: category || 'uncategorized',
      tags: tags || [],
      status: status || 'draft',
      seo: seo || {},
      featuredImage: featuredImage || {},
      slug: req.body.slug
    });

    await blog.save();
    
    // Populate author info
    await blog.populate('author', 'name email');

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      blog
    });
  } catch (error) {
    console.error('Blog creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create blog',
      details: error.message 
    });
  }
};

// Get all blogs with filters
exports.getAllBlogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      author,
      search,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const query = {};
    
    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (author) query.author = author;
    
    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Only show published blogs to non-admin users
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'published';
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name email')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      blogs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch blogs',
      details: error.message 
    });
  }
};

// Get single blog by slug
exports.getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const blog = await Blog.findOne({ slug })
      .populate('author', 'name email bio')
      .populate('comments.user', 'name');

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Only show draft blogs to author or admin
    if (blog.status === 'draft' && 
        (!req.user || (req.user._id.toString() !== blog.author._id.toString() && req.user.role !== 'admin'))) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Increment view count
    blog.views += 1;
    await blog.save();

    res.json({
      success: true,
      blog
    });
  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch blog',
      details: error.message 
    });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Check authorization
    if (req.user._id.toString() !== blog.author.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this blog' });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (['title', 'content', 'category', 'tags', 'status', 'seo', 'featuredImage', 'slug'].includes(key)) {
        blog[key] = updates[key];
      }
    });

    blog.updatedAt = new Date();
    await blog.save();
    
    await blog.populate('author', 'name email');

    res.json({
      success: true,
      message: 'Blog updated successfully',
      blog
    });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ 
      error: 'Failed to update blog',
      details: error.message 
    });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Check authorization
    if (req.user._id.toString() !== blog.author.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this blog' });
    }

    await blog.deleteOne();

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ 
      error: 'Failed to delete blog',
      details: error.message 
    });
  }
};

// Like blog
exports.likeBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    blog.likes += 1;
    await blog.save();

    res.json({
      success: true,
      likes: blog.likes
    });
  } catch (error) {
    console.error('Like blog error:', error);
    res.status(500).json({ 
      error: 'Failed to like blog',
      details: error.message 
    });
  }
};

// Add comment
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    blog.comments.push({
      user: req.user._id,
      content: content.trim(),
      createdAt: new Date()
    });

    await blog.save();
    await blog.populate('comments.user', 'name');

    res.json({
      success: true,
      message: 'Comment added successfully',
      comments: blog.comments
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ 
      error: 'Failed to add comment',
      details: error.message 
    });
  }
};

// Get blog statistics for admin
exports.getBlogStats = async (req, res) => {
  try {
    const stats = await Blog.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' }
        }
      }
    ]);

    const categoryStats = await Blog.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const topBlogs = await Blog.find({ status: 'published' })
      .sort({ views: -1 })
      .limit(5)
      .select('title slug views likes');

    const recentBlogs = await Blog.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'name')
      .select('title slug status createdAt author');

    res.json({
      success: true,
      stats: {
        byStatus: stats,
        byCategory: categoryStats,
        topBlogs,
        recentBlogs
      }
    });
  } catch (error) {
    console.error('Get blog stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch blog statistics',
      details: error.message 
    });
  }
};
