const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const jitsiRoutes = require('./routes/jitsi');
const meetingRoutes = require('./routes/meetings');
const turnRoutes = require('./routes/turn');
const livekitRoutes = require('./routes/livekit');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./services/logger');
const notifyRoutes = require('./routes/notify');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});

const setupRoutes = require('./routes/setup');

// Add setup routes (protected - only in development or with admin key)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SETUP === 'true') {
  app.use('/api/setup', setupRoutes);
  console.log('Setup routes enabled');
}


app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Routes
app.use('/api/jitsi', jitsiRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/turn', turnRoutes);
app.use('/api/livekit', livekitRoutes);
app.use('/api/notify', notifyRoutes);
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Jitsi API server running on port ${PORT}`);
});

module.exports = app;