const jwt = require('jsonwebtoken');
const logger = require('../services/logger');

// Simple authentication middleware (adjust based on your auth system)
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      // For development, allow requests without token
      if (process.env.NODE_ENV === 'development') {
        req.user = { id: 'dev-user', role: 'doctor' };
        return next();
      }
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based authorization
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (roles && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

module.exports = { authenticate, authorize };