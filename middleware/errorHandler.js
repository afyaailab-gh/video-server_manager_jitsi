const logger = require('../services/logger');

function errorHandler(err, req, res, next) {
  logger.error('Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path
  });
}

module.exports = { errorHandler };