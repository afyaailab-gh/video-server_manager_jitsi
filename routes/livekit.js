const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { generateLiveKitToken } = require('../services/livekit-token');
const logger = require('../services/logger');

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many token requests',
});

// POST /api/livekit/token
router.post('/token', limiter, async (req, res) => {
  const { roomName, participantIdentity, participantName } = req.body;

  if (!roomName || !participantIdentity) {
    return res.status(400).json({ error: 'roomName and participantIdentity are required' });
  }

  const wsUrl = process.env.LIVEKIT_URL;
  if (!wsUrl) {
    return res.status(503).json({ error: 'LiveKit not configured on this server' });
  }

  try {
    const token = await generateLiveKitToken(roomName, participantIdentity, participantName);
    res.json({ token, url: wsUrl });
  } catch (error) {
    logger.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;
