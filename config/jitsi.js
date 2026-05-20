module.exports = {
  // Jitsi Meet server configuration
  jitsiHost: process.env.JITSI_HOST || 'meet.jit.si',
  jitsiPort: process.env.JITSI_PORT || 443,
  useSSL: true,
  
  // JWT configuration for authenticated meetings
  jwtSecret: process.env.JITSI_SECRET,
  
  // Default meeting options
  defaultOptions: {
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    prejoinPageEnabled: false,
    disableDeepLinking: true,
    enableNoisyMicDetection: false,
    disableInviteFunctions: true,
    disableProfile: true,
    disableSimulcast: false,
    resolution: 720,
    constraints: {
      video: {
        height: { ideal: 720, max: 720, min: 180 },
        width: { ideal: 1280, max: 1280, min: 320 }
      }
    }
  },
  
  // Interface configuration
  interfaceConfig: {
    SHOW_JITSI_WATERMARK: false,
    SHOW_BRAND_WATERMARK: true,
    SHOW_WATERMARK_FOR_GUESTS: false,
    DEFAULT_BACKGROUND: '#1a1a1a',
    DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
    TOOLBAR_BUTTONS: [
      'microphone', 'camera', 'closedcaptions', 'desktop',
      'fullscreen', 'fodeviceselection', 'hangup', 'profile',
      'chat', 'recording', 'settings', 'raisehand',
      'videoquality', 'filmstrip', 'security'
    ],
    SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
    MOBILE_APP_PROMO: false
  },
  
  // Privacy and security
  enableLipSync: false,
  enableTalkWhileMuted: false,
  requireDisplayName: false,
  enableWelcomePage: false,
  
  // Recording configuration (if using Jibri)
  recording: {
    enabled: false,
    jibriUrl: process.env.JIBRI_URL || '',
    jibriSecret: process.env.JIBRI_SECRET || ''
  }
};