const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { authenticate, authorize } = require('../middleware/auth');

// Schedule a new meeting (doctor or admin only)
router.post('/', authenticate, authorize(['doctor', 'admin']), meetingController.createMeeting.bind(meetingController));

// List meetings (all authenticated users; filter by doctorId/patientId via query params)
router.get('/', authenticate, meetingController.getMeetings.bind(meetingController));

// Get a specific meeting
router.get('/:meetingId', authenticate, meetingController.getMeetingById.bind(meetingController));

// Update meeting details (doctor or admin only)
router.put('/:meetingId', authenticate, authorize(['doctor', 'admin']), meetingController.updateMeeting.bind(meetingController));

// Delete / cancel a meeting (doctor or admin only)
router.delete('/:meetingId', authenticate, authorize(['doctor', 'admin']), meetingController.deleteMeeting.bind(meetingController));

// Join a meeting — returns Jitsi URL + access token
router.post('/:meetingId/join', authenticate, meetingController.joinMeeting.bind(meetingController));

// End a meeting (doctor or admin only)
router.post('/:meetingId/end', authenticate, authorize(['doctor', 'admin']), meetingController.endMeeting.bind(meetingController));

module.exports = router;
