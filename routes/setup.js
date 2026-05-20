const express = require('express');
const router = express.Router();
const passwordService = require('../services/passwordService');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Generate new secrets for Jitsi setup
 */
router.post('/generate-secrets', async (req, res) => {
  try {
    const config = passwordService.generateFullConfig();
    
    res.json({
      success: true,
      message: 'Secrets generated successfully. Save these values securely!',
      config: {
        // For your API .env
        api_env: `# Add these to your existing .env file
JWT_SECRET=${config.api.JWT_SECRET}
JWT_EXPIRY=${config.api.JWT_EXPIRY}
JITSI_SECRET=${config.jitsi.JITSI_SECRET}
JWT_APP_SECRET=${config.jitsi.JWT_APP_SECRET}
JWT_APP_ID=${config.jitsi.JWT_APP_ID}
`,
        // For Jitsi Docker .env file
        jitsi_env: passwordService.generateJitsiEnvFile(config.jitsi),
        // Summary for manual setup
        summary: {
          api: config.api,
          jitsi: {
            ...config.jitsi,
            JITSI_SECRET: '***HIDDEN***',
            JWT_APP_SECRET: '***HIDDEN***'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error generating secrets:', error);
    res.status(500).json({ error: 'Failed to generate secrets' });
  }
});

/**
 * Generate and save Jitsi .env file
 */
router.post('/save-jitsi-env', async (req, res) => {
  try {
    const { outputPath, publicUrl } = req.body;
    
    if (!publicUrl) {
      return res.status(400).json({ error: 'Public URL is required (e.g., https://meet.yourcompany.com)' });
    }
    
    const config = passwordService.generateFullConfig();
    config.jitsi.PUBLIC_URL = publicUrl;
    
    const envContent = passwordService.generateJitsiEnvFile(config.jitsi);
    
    const savePath = outputPath || path.join(os.homedir(), 'jitsi-docker-jitsi-meet', '.env');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(savePath), { recursive: true });
    
    // Save the file
    await fs.writeFile(savePath, envContent);
    
    res.json({
      success: true,
      message: `Jitsi .env file saved to ${savePath}`,
      filePath: savePath,
      content: envContent
    });
  } catch (error) {
    console.error('Error saving Jitsi env file:', error);
    res.status(500).json({ error: 'Failed to save Jitsi environment file' });
  }
});

/**
 * Generate docker-compose override for your existing setup
 */
router.post('/generate-docker-override', async (req, res) => {
  try {
    const config = passwordService.generateFullConfig();
    const override = passwordService.generateDockerComposeOverride(config);
    
    res.json({
      success: true,
      dockerComposeOverride: override
    });
  } catch (error) {
    console.error('Error generating docker override:', error);
    res.status(500).json({ error: 'Failed to generate docker compose override' });
  }
});

/**
 * Quick setup - one command to generate everything
 */
router.post('/quick-setup', async (req, res) => {
  try {
    const { publicUrl, outputDir } = req.body;
    
    if (!publicUrl) {
      return res.status(400).json({ error: 'Public URL is required' });
    }
    
    const config = passwordService.generateFullConfig();
    config.jitsi.PUBLIC_URL = publicUrl;
    
    const setupDir = outputDir || path.join(process.cwd(), 'jitsi-setup');
    await fs.mkdir(setupDir, { recursive: true });
    
    // Generate all files
    const files = {
      'jitsi.env': passwordService.generateJitsiEnvFile(config.jitsi),
      'docker-compose.override.yml': passwordService.generateDockerComposeOverride(config),
      'api.env.append': `# Add these to your existing API .env file
JWT_SECRET=${config.api.JWT_SECRET}
JWT_EXPIRY=${config.api.JWT_EXPIRY}
JITSI_SECRET=${config.jitsi.JITSI_SECRET}
JWT_APP_SECRET=${config.jitsi.JWT_APP_SECRET}
JWT_APP_ID=${config.jitsi.JWT_APP_ID}
JITSI_HOST=localhost
JITSI_PORT=8443
`,
      'setup-instructions.txt': `# Jitsi Self-Hosted Setup Instructions

1. First, clone the Jitsi Docker repository:
   git clone https://github.com/jitsi/docker-jitsi-meet
   cd docker-jitsi-meet

2. Copy the generated jitsi.env file to the Jitsi directory:
   cp ${path.join(setupDir, 'jitsi.env')} .env

3. Run the password generator script (if you want to regenerate):
   ./gen-passwords.sh

4. Start Jitsi services:
   docker-compose up -d

5. Update your API .env file with the values from api.env.append

6. Restart your API:
   npm restart

7. Your Jitsi instance will be available at: ${publicUrl}

Important Security Notes:
- JITSI_SECRET: ${config.jitsi.JITSI_SECRET} (SAVE THIS)
- JWT_APP_SECRET: ${config.jitsi.JWT_APP_SECRET} (SAVE THIS)
- JWT_SECRET: ${config.api.JWT_SECRET} (SAVE THIS)

These secrets are only shown once. Store them in a password manager!
`
    };
    
    // Write all files
    for (const [filename, content] of Object.entries(files)) {
      await fs.writeFile(path.join(setupDir, filename), content);
    }
    
    res.json({
      success: true,
      message: `Quick setup complete! Files saved to ${setupDir}`,
      setupDir,
      files: Object.keys(files),
      secrets: {
        jitsiSecret: config.jitsi.JITSI_SECRET,
        jwtSecret: config.api.JWT_SECRET,
        jwtAppSecret: config.jitsi.JWT_APP_SECRET,
        jwtAppId: config.jitsi.JWT_APP_ID
      },
      warning: "These secrets are shown once. Save them immediately!"
    });
  } catch (error) {
    console.error('Quick setup error:', error);
    res.status(500).json({ error: 'Quick setup failed' });
  }
});

module.exports = router;