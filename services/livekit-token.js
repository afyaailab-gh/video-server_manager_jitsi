// services/livekit-token.js
const { AccessToken } = require('livekit-server-sdk');

async function generateLiveKitToken(roomName, participantIdentity, participantName) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured');
  }
  
  console.log(`Generating token for: ${participantIdentity} (${participantName}) in room: ${roomName}`);
  
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    ttl: 3600, // 1 hour
    metadata: JSON.stringify({ 
      name: participantName,
      room: roomName 
    }),
  });
  
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  
  const token = await at.toJwt();
  return token;
}

module.exports = { generateLiveKitToken };