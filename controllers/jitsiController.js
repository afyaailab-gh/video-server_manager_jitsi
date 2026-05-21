const jitsiService = require('../services/jitsiService');
const tokenService = require('../services/tokenService');
const logger = require('../services/logger');

class JitsiController {
  /**
   * Create a new Jitsi meeting
   */
  async createMeeting(req, res) {
    try {
      const { meetingId, title, doctorId, patientId, doctorName, patientName } = req.body;
      
      if (!meetingId) {
        return res.status(400).json({ error: 'Meeting ID is required' });
      }
      
      // Generate unique room name
      const roomName = jitsiService.generateRoomName(meetingId, title);
      
      // Generate URLs for doctor and patient
      const doctorUrl = jitsiService.createMeetingUrl(roomName, {
        id: doctorId,
        name: doctorName,
        isDoctor: true,
        role: 'doctor'
      }, { startWithAudioMuted: false });
      
      const patientUrl = jitsiService.createMeetingUrl(roomName, {
        id: patientId,
        name: patientName,
        isDoctor: false,
        role: 'patient'
      }, { startWithAudioMuted: true, startWithVideoMuted: true });
      
      // Generate embed codes
      const doctorEmbed = jitsiService.generateEmbedCode(roomName, {
        id: doctorId,
        name: doctorName,
        isDoctor: true
      }, { width: '100%', height: '600px' });
      
      const patientEmbed = jitsiService.generateEmbedCode(roomName, {
        id: patientId,
        name: patientName,
        isDoctor: false
      }, { width: '100%', height: '600px' });
      
      res.json({
        success: true,
        roomName,
        urls: {
          doctor: doctorUrl,
          patient: patientUrl
        },
        embed: {
          doctor: doctorEmbed,
          patient: patientEmbed
        },
        config: {
          startWithAudioMuted: false,
          startWithVideoMuted: false
        }
      });
      
    } catch (error) {
      logger.error('Error creating Jitsi meeting:', error);
      res.status(500).json({ error: 'Failed to create meeting' });
    }
  }
  
  /**
   * Get meeting join URL with token
   */
  async getMeetingUrl(req, res) {
    try {
      const { meetingId, userId, userName, role } = req.query;
      
      if (!meetingId || !userId || !userName) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // Generate access token
      const accessToken = tokenService.generateMeetingToken(meetingId, userId, role);
      
      // Create meeting URL
      const roomName = jitsiService.generateRoomName(meetingId);
      const meetingUrl = jitsiService.createMeetingUrl(roomName, {
        id: userId,
        name: userName,
        isDoctor: role === 'doctor',
        role
      });
      
      res.json({
        success: true,
        meetingUrl,
        accessToken,
        roomName
      });
      
    } catch (error) {
      logger.error('Error getting meeting URL:', error);
      res.status(500).json({ error: 'Failed to generate meeting URL' });
    }
  }
  
  /**
   * End a Jitsi meeting
   */
  async endMeeting(req, res) {
    try {
      const { roomName } = req.params;
      
      const result = await jitsiService.endMeeting(roomName);
      
      res.json({
        success: result,
        message: result ? 'Meeting ended successfully' : 'Failed to end meeting'
      });
      
    } catch (error) {
      logger.error('Error ending meeting:', error);
      res.status(500).json({ error: 'Failed to end meeting' });
    }
  }
  
  /**
   * Generate a Jitsi JWT for a patient/doctor without requiring API auth.
   * Used by the frontend to get a signed token before joining a room.
   */
  async generatePublicToken(req, res) {
    try {
      const { meetingId, userName, role } = req.body;
      if (!meetingId || !userName) {
        return res.status(400).json({ error: 'meetingId and userName are required' });
      }
      const roomName = `AfyaCare-${meetingId}`;
      const token = jitsiService.generateToken(
        roomName,
        { id: `${role || 'patient'}-${meetingId}`, name: userName, role: role || 'patient' },
        role === 'doctor',
      );
      res.json({ token, roomName });
    } catch (error) {
      logger.error('Error generating public token:', error);
      res.status(500).json({ error: 'Failed to generate token' });
    }
  }

  /**
   * Meeting webhook handler
   */
  async handleWebhook(req, res) {
    try {
      const event = req.body;
      logger.info('Jitsi webhook received:', event);
      
      // Process different event types
      switch (event.type) {
        case 'participant_joined':
          // Handle participant joined
          console.log(`Participant ${event.data.name} joined room ${event.data.room}`);
          break;
        case 'participant_left':
          // Handle participant left
          console.log(`Participant left room ${event.data.room}`);
          break;
        case 'meeting_ended':
          // Handle meeting ended
          console.log(`Meeting ${event.data.room} ended`);
          break;
        default:
          console.log('Unknown event type:', event.type);
      }
      
      res.json({ received: true });
      
    } catch (error) {
      logger.error('Error handling webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  }
  
  /**
   * Get meeting information
   */
  async getMeetingInfo(req, res) {
    try {
      const { roomName } = req.params;
      
      const info = await jitsiService.getMeetingInfo(roomName);
      
      res.json({
        success: true,
        info
      });
      
    } catch (error) {
      logger.error('Error getting meeting info:', error);
      res.status(500).json({ error: 'Failed to get meeting info' });
    }
  }
}

module.exports = new JitsiController();