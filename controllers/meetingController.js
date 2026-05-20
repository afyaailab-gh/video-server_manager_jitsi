const { v4: uuidv4 } = require('uuid');
const jitsiService = require('../services/jitsiService');
const tokenService = require('../services/tokenService');
const logger = require('../services/logger');

// In-memory store — replace with a DB/Redis adapter as needed
const meetings = new Map();

class MeetingController {
  /**
   * POST /api/meetings
   * Schedule a new meeting between a doctor and patient.
   */
  async createMeeting(req, res) {
    try {
      const {
        title,
        doctorId,
        doctorName,
        doctorEmail,
        patientId,
        patientName,
        patientEmail,
        scheduledAt,
        durationMinutes = 30,
        notes
      } = req.body;

      if (!doctorId || !doctorName || !patientId || !patientName) {
        return res.status(400).json({
          success: false,
          error: 'doctorId, doctorName, patientId and patientName are required'
        });
      }

      const meetingId = uuidv4();
      const roomName = jitsiService.generateRoomName(meetingId, title);

      const meeting = {
        id: meetingId,
        title: title || `Consultation — ${doctorName} & ${patientName}`,
        roomName,
        doctorId,
        doctorName,
        doctorEmail: doctorEmail || '',
        patientId,
        patientName,
        patientEmail: patientEmail || '',
        scheduledAt: scheduledAt || new Date().toISOString(),
        durationMinutes,
        notes: notes || '',
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      meetings.set(meetingId, meeting);
      logger.info('Meeting created', { meetingId, roomName });

      res.status(201).json({ success: true, meeting });
    } catch (error) {
      logger.error('Error creating meeting:', error);
      res.status(500).json({ success: false, error: 'Failed to create meeting' });
    }
  }

  /**
   * GET /api/meetings
   * List meetings. Optionally filter by doctorId or patientId query param.
   */
  getMeetings(req, res) {
    try {
      const { doctorId, patientId, status } = req.query;
      let list = Array.from(meetings.values());

      if (doctorId) list = list.filter(m => m.doctorId === doctorId);
      if (patientId) list = list.filter(m => m.patientId === patientId);
      if (status) list = list.filter(m => m.status === status);

      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({ success: true, meetings: list, total: list.length });
    } catch (error) {
      logger.error('Error listing meetings:', error);
      res.status(500).json({ success: false, error: 'Failed to list meetings' });
    }
  }

  /**
   * GET /api/meetings/:meetingId
   */
  getMeetingById(req, res) {
    try {
      const { meetingId } = req.params;
      const meeting = meetings.get(meetingId);

      if (!meeting) {
        return res.status(404).json({ success: false, error: 'Meeting not found' });
      }

      res.json({ success: true, meeting });
    } catch (error) {
      logger.error('Error getting meeting:', error);
      res.status(500).json({ success: false, error: 'Failed to get meeting' });
    }
  }

  /**
   * PUT /api/meetings/:meetingId
   */
  updateMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const meeting = meetings.get(meetingId);

      if (!meeting) {
        return res.status(404).json({ success: false, error: 'Meeting not found' });
      }

      const allowedFields = ['title', 'scheduledAt', 'durationMinutes', 'notes', 'status'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      const updated = { ...meeting, ...updates, updatedAt: new Date().toISOString() };
      meetings.set(meetingId, updated);
      logger.info('Meeting updated', { meetingId });

      res.json({ success: true, meeting: updated });
    } catch (error) {
      logger.error('Error updating meeting:', error);
      res.status(500).json({ success: false, error: 'Failed to update meeting' });
    }
  }

  /**
   * DELETE /api/meetings/:meetingId
   */
  deleteMeeting(req, res) {
    try {
      const { meetingId } = req.params;

      if (!meetings.has(meetingId)) {
        return res.status(404).json({ success: false, error: 'Meeting not found' });
      }

      meetings.delete(meetingId);
      logger.info('Meeting deleted', { meetingId });

      res.json({ success: true, message: 'Meeting deleted' });
    } catch (error) {
      logger.error('Error deleting meeting:', error);
      res.status(500).json({ success: false, error: 'Failed to delete meeting' });
    }
  }

  /**
   * POST /api/meetings/:meetingId/join
   * Returns Jitsi URL + access token for a participant to join.
   */
  joinMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const meeting = meetings.get(meetingId);

      if (!meeting) {
        return res.status(404).json({ success: false, error: 'Meeting not found' });
      }

      if (meeting.status === 'ended') {
        return res.status(410).json({ success: false, error: 'Meeting has already ended' });
      }

      const { userId, userName, userEmail, role } = req.body;

      if (!userId || !userName) {
        return res.status(400).json({ success: false, error: 'userId and userName are required' });
      }

      const isDoctor = role === 'doctor';
      const accessToken = tokenService.generateMeetingToken(meetingId, userId, role || 'patient');

      const meetingUrl = jitsiService.createMeetingUrl(meeting.roomName, {
        id: userId,
        name: userName,
        email: userEmail || '',
        isDoctor,
        role: role || 'patient'
      }, {
        startWithAudioMuted: !isDoctor,
        startWithVideoMuted: !isDoctor
      });

      const embedCode = jitsiService.generateEmbedCode(meeting.roomName, {
        id: userId,
        name: userName,
        email: userEmail || '',
        isDoctor,
        role: role || 'patient'
      }, { width: '100%', height: '600px' });

      // Mark as active once someone joins
      if (meeting.status === 'scheduled') {
        meetings.set(meetingId, { ...meeting, status: 'active', updatedAt: new Date().toISOString() });
      }

      logger.info('Participant joining meeting', { meetingId, userId, role });

      res.json({
        success: true,
        meetingUrl,
        accessToken,
        embedCode,
        roomName: meeting.roomName,
        meeting: meetings.get(meetingId)
      });
    } catch (error) {
      logger.error('Error joining meeting:', error);
      res.status(500).json({ success: false, error: 'Failed to join meeting' });
    }
  }

  /**
   * POST /api/meetings/:meetingId/end
   */
  async endMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const meeting = meetings.get(meetingId);

      if (!meeting) {
        return res.status(404).json({ success: false, error: 'Meeting not found' });
      }

      await jitsiService.endMeeting(meeting.roomName);

      const updated = { ...meeting, status: 'ended', updatedAt: new Date().toISOString() };
      meetings.set(meetingId, updated);
      logger.info('Meeting ended', { meetingId });

      res.json({ success: true, message: 'Meeting ended', meeting: updated });
    } catch (error) {
      logger.error('Error ending meeting:', error);
      res.status(500).json({ success: false, error: 'Failed to end meeting' });
    }
  }
}

module.exports = new MeetingController();
