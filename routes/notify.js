// routes/notify.js
const express = require('express');
const router = express.Router();
const { sendParticipantJoinedEmail, sendAppointmentReminder } = require('../services/emailService');
const logger = require('../services/logger');

// POST /api/notify/participant-joined
router.post('/participant-joined', async (req, res) => {
  try {
    const {
      meetingId,
      doctorName,
      doctorEmail,
      patientName,
      patientEmail,
      title,
      joinLink,
      participantType, // 'doctor' or 'patient'
    } = req.body;

    if (!meetingId || !doctorName || !patientName || !title || !joinLink || !participantType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['meetingId', 'doctorName', 'patientName', 'title', 'joinLink', 'participantType']
      });
    }

    // Determine which email to send based on who joined
    const emailData = {
      meetingId,
      doctorName,
      doctorEmail: doctorEmail || process.env.DEFAULT_DOCTOR_EMAIL,
      patientName,
      patientEmail: patientEmail || process.env.DEFAULT_PATIENT_EMAIL,
      title,
      joinLink,
      participantType,
    };

    logger.info(`Sending participant-joined email for meeting ${meetingId}`);
    const result = await sendParticipantJoinedEmail(emailData);

    res.json({
      success: true,
      messageId: result?.messageId || null,
      message: result
        ? `Notification sent to ${participantType === 'doctor' ? patientName : doctorName}`
        : 'Email not configured — notification skipped',
    });
  } catch (error) {
    logger.error('Error sending participant-joined notification:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
});

// POST /api/notify/appointment-reminder
router.post('/appointment-reminder', async (req, res) => {
  try {
    const {
      meetingId,
      doctorName,
      doctorEmail,
      patientName,
      patientEmail,
      title,
      joinLink,
      scheduledTime,
    } = req.body;

    if (!meetingId || !doctorName || !patientName || !title || !joinLink) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailData = {
      meetingId,
      doctorName,
      doctorEmail: doctorEmail || process.env.DEFAULT_DOCTOR_EMAIL,
      patientName,
      patientEmail: patientEmail || process.env.DEFAULT_PATIENT_EMAIL,
      title,
      joinLink,
      scheduledTime,
    };

    logger.info(`Sending appointment reminder for meeting ${meetingId}`);
    const result = await sendAppointmentReminder(emailData);
    
    res.json({ 
      success: true, 
      messageId: result?.messageId,
      message: 'Appointment reminder sent'
    });
  } catch (error) {
    logger.error('Error sending appointment reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

module.exports = router;