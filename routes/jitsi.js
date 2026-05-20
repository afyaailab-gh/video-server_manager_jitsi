const express = require('express');
const router = express.Router();
const jitsiController = require('../controllers/jitsiController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/create-meeting', authenticate, authorize(['doctor', 'admin']), jitsiController.createMeeting);
router.get('/meeting-url', authenticate, jitsiController.getMeetingUrl);
router.post('/end-meeting/:roomName', authenticate, authorize(['doctor', 'admin']), jitsiController.endMeeting);
router.get('/meeting-info/:roomName', authenticate, jitsiController.getMeetingInfo);
router.post('/webhook', jitsiController.handleWebhook);

module.exports = router;