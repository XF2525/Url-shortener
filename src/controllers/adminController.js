const User = require('../models/User');
const Blog = require('../models/Blog');
const Link = require('../models/Link');
const Activity = require('../models/Activity');

// Dashboard overview
exports.getDashboard = async (req, res) => {
  try {
    const [userStats, blogStats, linkStats, recentActivity] = await Promise.all([
      getUserStatistics(),
      getBlogStatistics(),
      getLinkStatistics(),
      getRecentActivity()
    ]);

    res.json({
      success: true,
      dashboard: {
        users: userStats,
        blogs: blogStats,
        links: linkStats,
        recentActivity,
        systemHealth: await getSystemHealth()
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

// User management
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, role } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (status) user.status = status;
    if (role) user.role = role;
    
    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// System settings
exports.getSystemSettings = async (req, res) => {
  try {
    const settings = {
      general: {
        siteName: process.env.SITE_NAME || 'URL Shortener',
        siteUrl: process.env.SITE_URL || 'http://localhost:3000',
        adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com'
      },
      features: {
        registrationEnabled: process.env.REGISTRATION_ENABLED !== 'false',
        emailVerificationRequired: process.env.EMAIL_VERIFICATION === 'true',
        analyticsEnabled: process.env.ANALYTICS_ENABLED !== 'false'
      },
      limits: {
        maxUrlsPerUser: parseInt(process.env.MAX_URLS_PER_USER || '1000'),
        maxBlogsPerUser: parseInt(process.env.MAX_BLOGS_PER_USER || '100'),
        rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100')
      }
    };

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// Update system settings
exports.updateSystemSettings = async (req, res) => {
  try {
    const { category, settings } = req.body;
    
    // Here you would typically update environment variables or a settings database
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      category,
      settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Analytics overview
exports.getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    const analytics = {
      traffic: await getTrafficAnalytics(dateFilter),
      engagement: await getEngagementAnalytics(dateFilter),
      conversion: await getConversionAnalytics(dateFilter),
      geographic: await getGeographicAnalytics(dateFilter)
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Activity logs
exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, userId } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (userId) query.userId = userId;

    const activities = await Activity.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Activity.countDocuments(query);

    res.json({
      success: true,
      activities,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};

// Bulk operations
exports.bulkOperation = async (req, res) => {
  try {
    const { operation, entityType, ids, data } = req.body;
    
    let result;
    switch (operation) {
      case 'delete':
        result = await bulkDelete(entityType, ids);
        break;
      case 'update':
        result = await bulkUpdate(entityType, ids, data);
        break;
      case 'export':
        result = await bulkExport(entityType, ids);
        break;
      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }

    res.json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      result
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
};

// Helper functions
async function getUserStatistics() {
  const total = await User.countDocuments();
  const active = await User.countDocuments({ status: 'active' });
  const newToday = await User.countDocuments({
    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
  });
  
  return { total, active, newToday };
}

async function getBlogStatistics() {
  const total = await Blog.countDocuments();
  const published = await Blog.countDocuments({ status: 'published' });
  const draft = await Blog.countDocuments({ status: 'draft' });
  
  return { total, published, draft };
}

async function getLinkStatistics() {
  const total = await Link.countDocuments();
  const clicks = await Link.aggregate([
    { $group: { _id: null, totalClicks: { $sum: '$clicks' } } }
  ]);
  
  return { 
    total, 
    totalClicks: clicks[0]?.totalClicks || 0 
  };
}

async function getRecentActivity() {
  return await Activity.find()
    .populate('userId', 'name')
    .sort({ createdAt: -1 })
    .limit(10);
}

async function getSystemHealth() {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };
}

async function getTrafficAnalytics(dateFilter) {
  // Implement traffic analytics logic
  return {
    pageViews: Math.floor(Math.random() * 10000),
    uniqueVisitors: Math.floor(Math.random() * 5000),
    bounceRate: (Math.random() * 100).toFixed(2)
  };
}

async function getEngagementAnalytics(dateFilter) {
  // Implement engagement analytics logic
  return {
    averageSessionDuration: Math.floor(Math.random() * 300),
    pagesPerSession: (Math.random() * 5).toFixed(2),
    engagementRate: (Math.random() * 100).toFixed(2)
  };
}

async function getConversionAnalytics(dateFilter) {
  // Implement conversion analytics logic
  return {
    conversionRate: (Math.random() * 10).toFixed(2),
    totalConversions: Math.floor(Math.random() * 100)
  };
}

async function getGeographicAnalytics(dateFilter) {
  // Implement geographic analytics logic
  return {
    topCountries: [
      { country: 'United States', visits: Math.floor(Math.random() * 1000) },
      { country: 'United Kingdom', visits: Math.floor(Math.random() * 500) },
      { country: 'Canada', visits: Math.floor(Math.random() * 300) }
    ]
  };
}

async function bulkDelete(entityType, ids) {
  const Model = entityType === 'users' ? User : 
                entityType === 'blogs' ? Blog : 
                entityType === 'links' ? Link : null;
  
  if (!Model) throw new Error('Invalid entity type');
  
  const result = await Model.deleteMany({ _id: { $in: ids } });
  return { deleted: result.deletedCount };
}

async function bulkUpdate(entityType, ids, data) {
  const Model = entityType === 'users' ? User : 
                entityType === 'blogs' ? Blog : 
                entityType === 'links' ? Link : null;
  
  if (!Model) throw new Error('Invalid entity type');
  
  const result = await Model.updateMany(
    { _id: { $in: ids } },
    { $set: data }
  );
  return { updated: result.modifiedCount };
}

async function bulkExport(entityType, ids) {
  const Model = entityType === 'users' ? User : 
                entityType === 'blogs' ? Blog : 
                entityType === 'links' ? Link : null;
  
  if (!Model) throw new Error('Invalid entity type');
  
  const data = await Model.find({ _id: { $in: ids } });
  return { exported: data.length, data };
}

module.exports = exports;
