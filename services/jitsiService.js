const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const config = require('../config/jitsi');
const logger = require('./logger');

class JitsiService {
  constructor() {
    this.baseUrl = `${config.useSSL ? 'https' : 'http'}://${config.jitsiHost}:${config.jitsiPort}`;
  }

  /**
   * Generate JWT token for Jitsi meeting
   */
  generateToken(meetingId, userData, isModerator = false) {
    if (!config.jwtSecret) {
      logger.warn('JWT secret not configured, using simple room access');
      return null;
    }

    const payload = {
      aud: 'jitsi',
      iss: 'afyacare',
      sub: process.env.JITSI_SUBJECT || 'meet.jit.si',
      room: meetingId,
      context: {
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          moderator: isModerator,
          avatar: userData.avatar || '',
          group: userData.role || 'patient'
        },
        features: {
          recording: config.recording.enabled,
          livestreaming: false,
          transcription: true,
          'outbound-call': false
        }
      },
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    };

    return jwt.sign(payload, config.jwtSecret, { algorithm: 'HS256' });
  }

  /**
   * Generate a unique room name for Jitsi
   */
  generateRoomName(meetingId, customName = null) {
    if (customName) {
      return `afyacare-${customName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    }
    return `afyacare-${meetingId}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Get meeting information from Jitsi server
   */
  async getMeetingInfo(roomName) {
    try {
      // This requires Jitsi Meet's prosody HTTP API
      const response = await axios.get(`${this.baseUrl}/room/${roomName}`, {
        headers: {
          'Authorization': `Bearer ${config.jwtSecret}`
        },
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get meeting info:', error.message);
      return null;
    }
  }

  /**
   * Create or get meeting URL with options
   */
  createMeetingUrl(roomName, userData, options = {}) {
    const token = this.generateToken(roomName, userData, userData.isDoctor);
    const configOptions = { ...config.defaultOptions, ...options };
    
    let url = `${this.baseUrl}/${roomName}`;
    
    const configParams = new URLSearchParams();
    
    // Add user info
    configParams.append('userInfo.displayName', userData.name);
    if (userData.email) {
      configParams.append('userInfo.email', userData.email);
    }
    
    // Add configuration options
    Object.entries(configOptions).forEach(([key, value]) => {
      if (typeof value === 'object') {
        configParams.append(`config.${key}`, JSON.stringify(value));
      } else {
        configParams.append(`config.${key}`, value);
      }
    });
    
    // Add interface config
    Object.entries(config.interfaceConfig).forEach(([key, value]) => {
      configParams.append(`interfaceConfig.${key}`, value);
    });
    
    // Add JWT token if available
    if (token) {
      configParams.append('jwt', token);
    }
    
    const queryString = configParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return url;
  }

  /**
   * Generate embed code for iframe
   */
  generateEmbedCode(roomName, userData, options = {}) {
    const meetingUrl = this.createMeetingUrl(roomName, userData, options);
    const width = options.width || '100%';
    const height = options.height || '100%';
    
    return `
      <iframe 
        src="${meetingUrl}"
        allow="camera; microphone; display-capture; fullscreen; autoplay"
        style="width: ${width}; height: ${height}; border: 0;"
        allowfullscreen
        title="Video Consultation">
      </iframe>
    `;
  }

  /**
   * Create a Jitsi webhook for meeting events
   */
  async registerWebhook(roomName, webhookUrl) {
    try {
      const response = await axios.post(`${this.baseUrl}/webhooks/register`, {
        room: roomName,
        url: webhookUrl,
        events: ['participant_joined', 'participant_left', 'meeting_ended', 'recording_status']
      }, {
        headers: { 'Authorization': `Bearer ${config.jwtSecret}` }
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to register webhook:', error.message);
      return null;
    }
  }

  /**
   * End a meeting forcefully
   */
  async endMeeting(roomName) {
    try {
      const response = await axios.post(`${this.baseUrl}/room/${roomName}/end`, {}, {
        headers: { 'Authorization': `Bearer ${config.jwtSecret}` }
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to end meeting:', error.message);
      return false;
    }
  }

  /**
   * Mute all participants (moderator only)
   */
  async muteAllParticipants(roomName) {
    try {
      const response = await axios.post(`${this.baseUrl}/room/${roomName}/mute-all`, {}, {
        headers: { 'Authorization': `Bearer ${config.jwtSecret}` }
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to mute participants:', error.message);
      return false;
    }
  }

  /**
   * Lock meeting (prevent new participants)
   */
  async lockMeeting(roomName, locked = true) {
    try {
      const response = await axios.post(`${this.baseUrl}/room/${roomName}/lock`, { locked }, {
        headers: { 'Authorization': `Bearer ${config.jwtSecret}` }
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to lock meeting:', error.message);
      return false;
    }
  }
}

module.exports = new JitsiService();