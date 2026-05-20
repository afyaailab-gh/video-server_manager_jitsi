#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

async function setup() {
  console.log('\n🔧 Jitsi Self-Hosted Setup Generator\n');
  console.log('This will generate all necessary configuration files for your Jitsi instance.\n');
  
  const publicUrl = await question('Enter your public Jitsi URL (e.g., https://meet.yourcompany.com): ');
  
  if (!publicUrl) {
    console.error('❌ Public URL is required');
    process.exit(1);
  }
  
  const outputDir = await question(`Output directory [./jitsi-setup]: `) || './jitsi-setup';
  
  console.log('\n🔄 Generating configuration...\n');
  
  try {
    const response = await axios.post(`${API_URL}/api/setup/quick-setup`, {
      publicUrl,
      outputDir
    });
    
    if (response.data.success) {
      console.log('✅ Setup files generated successfully!\n');
      console.log(`📁 Location: ${response.data.setupDir}`);
      console.log('\n📄 Generated files:');
      response.data.files.forEach(file => {
        console.log(`   - ${file}`);
      });
      
      console.log('\n🔑 IMPORTANT - Save these secrets:');
      console.log(`   JITSI_SECRET: ${response.data.secrets.jitsiSecret}`);
      console.log(`   JWT_SECRET: ${response.data.secrets.jwtSecret}`);
      console.log(`   JWT_APP_SECRET: ${response.data.secrets.jwtAppSecret}`);
      console.log(`   JWT_APP_ID: ${response.data.secrets.jwtAppId}`);
      
      console.log('\n📖 Next steps:');
      console.log('   1. cd docker-jitsi-meet');
      console.log('   2. cp ../jitsi-setup/jitsi.env .env');
      console.log('   3. docker-compose up -d');
      console.log('   4. Add API env variables from api.env.append to your .env file');
      console.log('   5. Restart your API: npm restart');
      console.log('\n⚠️  Keep these secrets secure! They are only shown once.\n');
    }
  } catch (error) {
    console.error('❌ Setup failed:', error.response?.data?.error || error.message);
    process.exit(1);
  }
  
  rl.close();
}

setup();