// routes/email.js
const express = require('express');
const router = express.Router();
const {
  sendParticipantJoinedEmail,
  sendAppointmentReminder,
  sendConsultationInviteEmail,
} = require('../services/emailService');
const logger = require('../services/logger');

// POST /api/email/participant-joined
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
      participantType,
    } = req.body;

    // Validate required fields
    if (!meetingId) {
      return res.status(400).json({ error: 'meetingId is required' });
    }
    if (!doctorName) {
      return res.status(400).json({ error: 'doctorName is required' });
    }
    if (!patientName) {
      return res.status(400).json({ error: 'patientName is required' });
    }
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!joinLink) {
      return res.status(400).json({ error: 'joinLink is required' });
    }
    if (!participantType || !['doctor', 'patient'].includes(participantType)) {
      return res.status(400).json({ error: 'participantType must be "doctor" or "patient"' });
    }

    // Check that we have at least one email to send to
    if (participantType === 'doctor' && !doctorEmail) {
      return res.status(400).json({ error: 'doctorEmail is required when participantType is "doctor"' });
    }
    if (participantType === 'patient' && !patientEmail) {
      return res.status(400).json({ error: 'patientEmail is required when participantType is "patient"' });
    }

    logger.info(`Sending participant-joined notification for meeting ${meetingId}`);

    const meetingData = {
      meetingId,
      doctorName,
      doctorEmail,
      patientName,
      patientEmail,
      title,
      joinLink,
      participantType,
    };

    const result = await sendParticipantJoinedEmail(meetingData);
    
    res.json({
      success: true,
      messageId: result?.messageId,
      message: `Notification sent to ${participantType === 'doctor' ? patientName : doctorName}`,
    });
  } catch (error) {
    logger.error('Error sending participant-joined notification:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      details: error.message,
    });
  }
});

// POST /api/email/appointment-reminder
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

    // Validate required fields
    if (!meetingId) {
      return res.status(400).json({ error: 'meetingId is required' });
    }
    if (!doctorName) {
      return res.status(400).json({ error: 'doctorName is required' });
    }
    if (!patientName) {
      return res.status(400).json({ error: 'patientName is required' });
    }
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!joinLink) {
      return res.status(400).json({ error: 'joinLink is required' });
    }
    if (!patientEmail) {
      return res.status(400).json({ error: 'patientEmail is required' });
    }

    logger.info(`Sending appointment reminder for meeting ${meetingId}`);

    const meetingData = {
      meetingId,
      doctorName,
      doctorEmail,
      patientName,
      patientEmail,
      title,
      joinLink,
      scheduledTime,
    };

    const result = await sendAppointmentReminder(meetingData);
    
    res.json({
      success: true,
      messageId: result?.messageId,
      message: `Appointment reminder sent to ${patientName}`,
    });
  } catch (error) {
    logger.error('Error sending appointment reminder:', error);
    res.status(500).json({
      error: 'Failed to send reminder',
      details: error.message,
    });
  }
});

// POST /api/email/test (for testing your email configuration)
router.post('/test', async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({ error: 'testEmail is required' });
    }

    // Import the transporter directly or create a test function
    const nodemailer = require('nodemailer');
    let testTransporter;
    
    const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';
    
    if (emailProvider === 'gmail') {
      testTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    } else if (emailProvider === 'sendgrid') {
      testTransporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    } else {
      testTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }

    const mailOptions = {
      from: `"AfyaCare Test" <${process.env.EMAIL_FROM || 'noreply@afyacare.com'}>`,
      to: testEmail,
      subject: 'AfyaCare Email Configuration Test',
      html: `
        <h1>✅ Email Configuration Working!</h1>
        <p>This is a test email to confirm your email service is properly configured.</p>
        <p>Provider: <strong>${emailProvider}</strong></p>
        <p>Time: ${new Date().toLocaleString()}</p>
      `,
    };

    const info = await testTransporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: info.messageId,
      message: `Test email sent to ${testEmail}`,
    });
  } catch (error) {
    logger.error('Error sending test email:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      details: error.message,
    });
  }
});

// POST /api/email/consultation-invite
router.post('/consultation-invite', async (req, res) => {
  try {
    const {
      meetingId,
      doctorName,
      patientName,
      patientEmail,
      title,
      joinLink,
      durationMinutes,
      consultationType,
      consultationPrice,
    } = req.body;

    if (!meetingId || !doctorName || !patientName || !patientEmail || !title || !joinLink) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['meetingId', 'doctorName', 'patientName', 'patientEmail', 'title', 'joinLink'],
      });
    }

    logger.info(`Sending consultation invite for meeting ${meetingId} to ${patientEmail}`);

    const result = await sendConsultationInviteEmail({
      meetingId,
      doctorName,
      patientName,
      patientEmail,
      title,
      joinLink,
      durationMinutes,
      consultationType,
      consultationPrice,
    });

    res.json({
      success: true,
      messageId: result?.messageId || null,
      message: result
        ? `Consultation invite sent to ${patientEmail}`
        : 'Email not configured — invite skipped',
    });
  } catch (error) {
    logger.error('Error sending consultation invite:', error);
    res.status(500).json({
      error: 'Failed to send consultation invite',
      details: error.message,
    });
  }
});

module.exports = router;