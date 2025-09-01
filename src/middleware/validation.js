const { body, param, query, validationResult } = require('express-validator');

// Blog validation rules
exports.validateBlogCreate = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be less than 200 characters'),
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ min: 100 }).withMessage('Content must be at least 100 characters'),
  body('category')
    .optional()
    .trim()
    .isIn(['technology', 'business', 'lifestyle', 'health', 'travel', 'food', 'uncategorized'])
    .withMessage('Invalid category'),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status')
];

exports.validateBlogUpdate = [
  param('id').isMongoId().withMessage('Invalid blog ID'),
  ...exports.validateBlogCreate
];

exports.validateBlogQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
  query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  query('category').optional().trim(),
  query('search').optional().trim()
];

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};
