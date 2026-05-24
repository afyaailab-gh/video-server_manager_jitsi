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
  // Accept both naming conventions
  const { 
    roomName, 
    participantIdentity,  // Standard field name
    identity,             // Alternative field name (your frontend sends this)
    participantName,      // Standard field name
    name,                 // Alternative field name (your frontend sends this)
    isDoctor, 
    meetingId 
  } = req.body;

  // Use either field name
  const finalIdentity = participantIdentity || identity;
  const finalParticipantName = participantName || name || 'Participant';

  if (!roomName || !finalIdentity) {
    return res.status(400).json({ error: 'roomName and participantIdentity/identity are required' });
  }

  const wsUrl = process.env.LIVEKIT_URL;
  if (!wsUrl) {
    return res.status(503).json({ error: 'LiveKit not configured on this server' });
  }

  try {
    const token = await generateLiveKitToken(roomName, finalIdentity, finalParticipantName);
    // Return in the format your frontend expects
    res.json({ 
      token, 
      url: wsUrl,
      wsUrl: wsUrl  // Send both field names for compatibility
    });
  } catch (error) {
    logger.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;