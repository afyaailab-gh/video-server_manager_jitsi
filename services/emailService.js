// services/emailService.js
const nodemailer = require('nodemailer');

let transporter = null;

const TIMEOUT_MS = 10000; // 10 s — fail fast instead of hanging

const initTransporter = () => {
  const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';

  if (emailProvider === 'gmail') {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email not configured: EMAIL_USER / EMAIL_PASSWORD missing. Skipping email send.');
      transporter = null;
      return;
    }
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
  } else if (emailProvider === 'sendgrid') {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('Email not configured: SENDGRID_API_KEY missing. Skipping email send.');
      transporter = null;
      return;
    }
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
  } else {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('Email not configured: SMTP_HOST / SMTP_USER / SMTP_PASSWORD missing. Skipping email send.');
      transporter = null;
      return;
    }
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
  }
};

// Send email notification when participant joins
const sendParticipantJoinedEmail = async (meetingData) => {
  const { 
    meetingId, 
    doctorName, 
    doctorEmail, 
    patientName, 
    patientEmail, 
    title, 
    joinLink,
    participantType, // 'doctor' or 'patient'
  } = meetingData;

  if (transporter === null) initTransporter();
  if (!transporter) {
    console.log('Email skipped: no credentials configured.');
    return null;
  }

  // Determine who should receive the email
  let toEmail, toName, otherName, otherType;
  
  if (participantType === 'doctor') {
    toEmail = doctorEmail;
    toName = doctorName;
    otherName = patientName;
    otherType = 'patient';
  } else {
    toEmail = patientEmail;
    toName = patientName;
    otherName = doctorName;
    otherType = 'doctor';
  }

  if (!toEmail) {
    console.log('No email address available for notification');
    return null;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  const dateStr = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const emailTemplate = {
    subject: `${otherName} has joined your consultation`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Participant Joined - AfyaCare</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f6f9;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .email-card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .email-header {
            background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
            padding: 32px 24px;
            text-align: center;
          }
          .email-header h1 {
            color: white;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .email-header p {
            color: rgba(255, 255, 255, 0.9);
            margin: 8px 0 0;
            font-size: 14px;
          }
          .email-content {
            padding: 32px 24px;
          }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 16px;
          }
          .message {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 24px;
          }
          .info-box {
            background: #f0fdf4;
            border-left: 4px solid #10b981;
            padding: 16px;
            margin: 24px 0;
            border-radius: 8px;
          }
          .info-box p {
            margin: 4px 0;
            font-size: 14px;
          }
          .info-box strong {
            color: #065f46;
          }
          .button {
            display: inline-block;
            background-color: #0d9488;
            color: white;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 8px;
            font-weight: 600;
            margin: 16px 0;
            transition: background-color 0.3s;
          }
          .button:hover {
            background-color: #0f766e;
          }
          .divider {
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
          }
          .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
          .participant-details {
            background: #f3f4f6;
            border-radius: 12px;
            padding: 16px;
            margin: 16px 0;
          }
          .badge {
            display: inline-block;
            background: #e0f2fe;
            color: #0369a1;
            font-size: 12px;
            padding: 4px 12px;
            border-radius: 20px;
            margin-bottom: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-card">
            <div class="email-header">
              <h1>🏥 AfyaCare</h1>
              <p>Real-time Consultation Notification</p>
            </div>
            
            <div class="email-content">
              <div class="greeting">Dear ${toName},</div>
              
              <div class="message">
                <strong>${otherName}</strong> (${otherType}) has joined your consultation <strong>"${title}"</strong>.
                Please proceed to join the call immediately.
              </div>

              <div class="info-box">
                <p><strong>📋 Consultation Details:</strong></p>
                <p><strong>Meeting ID:</strong> ${meetingId}</p>
                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Time:</strong> ${timeStr}</p>
              </div>

              <div class="participant-details">
                <span class="badge">🎥 ${participantType === 'doctor' ? 'Doctor' : 'Patient'} Joined</span>
                <p><strong>👤 ${otherType === 'doctor' ? 'Doctor' : 'Patient'}:</strong> ${otherName}</p>
                <p><strong>⏰ Joined at:</strong> ${timeStr}</p>
              </div>

              <div style="text-align: center;">
                <a href="${joinLink}" class="button">Join Consultation Now</a>
              </div>

              <div class="divider"></div>
              
              <p style="font-size: 14px; color: #6b7280;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} AfyaCare. All rights reserved.</p>
              <p>Secure video consultations for better healthcare</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      ${otherName} has joined your consultation "${title}".
      
      Consultation Details:
      - Meeting ID: ${meetingId}
      - Title: ${title}
      - Date: ${dateStr}
      - Time: ${timeStr}
      
      Join Link: ${joinLink}
      
      This is an automated notification. Please do not reply to this email.
      
      © ${new Date().getFullYear()} AfyaCare. All rights reserved.
    `,
  };

  try {
    const mailOptions = {
      from: `"AfyaCare" <${process.env.EMAIL_FROM || 'noreply@afyacare.com'}>`,
      to: toEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${toEmail}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Send appointment reminder email
const sendAppointmentReminder = async (meetingData) => {
  const { 
    meetingId, 
    doctorName, 
    doctorEmail, 
    patientName, 
    patientEmail, 
    title, 
    joinLink,
    scheduledTime,
  } = meetingData;

  if (transporter === null) initTransporter();
  if (!transporter) {
    console.log('Email skipped: no credentials configured.');
    return null;
  }

  const scheduledDate = scheduledTime ? new Date(scheduledTime) : null;
  const dateStr = scheduledDate ? scheduledDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'Today';
  const timeStr = scheduledDate ? scheduledDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  }) : 'Immediately';

  const emailTemplate = {
    subject: `Upcoming Consultation: ${title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Reminder - AfyaCare</title>
        <style>
          /* Same styles as above */
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f6f9;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .email-card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .email-header {
            background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
            padding: 32px 24px;
            text-align: center;
          }
          .email-header h1 {
            color: white;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .email-content {
            padding: 32px 24px;
          }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
          }
          .reminder-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 24px 0;
            border-radius: 8px;
          }
          .button {
            display: inline-block;
            background-color: #0d9488;
            color: white;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 8px;
            font-weight: 600;
            margin: 16px 0;
          }
          .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-card">
            <div class="email-header">
              <h1>🏥 AfyaCare</h1>
              <p>Appointment Reminder</p>
            </div>
            
            <div class="email-content">
              <div class="greeting">Hello,</div>
              
              <p>This is a reminder for your upcoming consultation:</p>

              <div class="reminder-box">
                <p><strong>📋 Appointment Details:</strong></p>
                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
                <p><strong>Patient:</strong> ${patientName}</p>
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Time:</strong> ${timeStr}</p>
              </div>

              <div style="text-align: center;">
                <a href="${joinLink}" class="button">Join Consultation</a>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                Please join 5 minutes before the scheduled time to ensure a smooth experience.
              </p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} AfyaCare. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Upcoming Consultation: ${title}
      
      Appointment Details:
      - Doctor: Dr. ${doctorName}
      - Patient: ${patientName}
      - Date: ${dateStr}
      - Time: ${timeStr}
      
      Join Link: ${joinLink}
      
      Please join 5 minutes before the scheduled time.
    `,
  };

  try {
    const mailOptions = {
      from: `"AfyaCare" <${process.env.EMAIL_FROM || 'noreply@afyacare.com'}>`,
      to: patientEmail,
      cc: doctorEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending reminder email:', error);
    throw error;
  }
};

module.exports = {
  sendParticipantJoinedEmail,
  sendAppointmentReminder,
};