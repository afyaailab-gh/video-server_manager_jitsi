const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class TokenService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.expiry = process.env.JWT_EXPIRY || '24h';
  }

  /**
   * Generate meeting token for patient/doctor
   */
  generateMeetingToken(meetingId, userId, userRole) {
    const payload = {
      meetingId,
      userId,
      role: userRole,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    };
    
    return jwt.sign(payload, this.secret, { expiresIn: this.expiry });
  }

  /**
   * Verify meeting token
   */
  verifyMeetingToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret);
      return { valid: true, data: decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Generate room access key
   */
  generateRoomKey(meetingId) {
    return crypto.createHmac('sha256', this.secret)
      .update(`${meetingId}-${Date.now()}`)
      .digest('hex')
      .substring(0, 16);
  }
}

module.exports = new TokenService();