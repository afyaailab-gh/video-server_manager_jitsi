const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const logger = require('../services/logger');

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many TURN token requests',
});

// POST /api/turn/token — returns short-lived Twilio TURN credentials
router.post('/token', limiter, async (req, res) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    logger.warn('TURN token requested but TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set');
    return res.status(503).json({ error: 'TURN not configured on this server' });
  }

  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    const token  = await client.tokens.create({ ttl: 3600 });

    res.json({
      username:   token.username,
      password:   token.password,
      iceServers: token.iceServers,
    });
  } catch (error) {
    logger.error('Error generating Twilio TURN token:', error);
    res.status(500).json({ error: 'Failed to generate TURN token' });
  }
});

module.exports = router;
