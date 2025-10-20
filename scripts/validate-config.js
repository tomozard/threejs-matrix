#!/usr/bin/env node

/**
 * Configuration Validation Script
 * Validates environment configuration before starting the application
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateEnvironmentFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, valid: false, errors: [`File ${filePath} does not exist`] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  const errors = [];
  const config = {};

  // Parse environment variables
  lines.forEach((line, index) => {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) {
      errors.push(`Line ${index + 1}: Invalid format - ${line}`);
      return;
    }
    
    const [, key, value] = match;
    config[key] = value;
  });

  // Required variables
  const required = [
    'NEXT_PUBLIC_STT_WS_URL',
    'NEXT_PUBLIC_TTS_WS_URL',
    'NEXT_PUBLIC_CHAT_WS_URL',
    'NEXT_PUBLIC_BACKEND_BASE_URL'
  ];

  // Check required variables
  required.forEach(key => {
    if (!config[key]) {
      errors.push(`Missing required variable: ${key}`);
    }
  });

  // Validate WebSocket URLs
  const wsUrls = [
    'NEXT_PUBLIC_STT_WS_URL',
    'NEXT_PUBLIC_TTS_WS_URL',
    'NEXT_PUBLIC_CHAT_WS_URL'
  ];

  wsUrls.forEach(key => {
    if (config[key] && !config[key].match(/^wss?:\/\//)) {
      errors.push(`${key} must start with ws:// or wss://`);
    }
  });

  // Validate backend URL
  if (config.NEXT_PUBLIC_BACKEND_BASE_URL) {
    try {
      new URL(config.NEXT_PUBLIC_BACKEND_BASE_URL);
    } catch {
      errors.push('NEXT_PUBLIC_BACKEND_BASE_URL is not a valid URL');
    }
  }

  // Validate numeric values
  const numericFields = [
    'NEXT_PUBLIC_WS_RECONNECT_INTERVAL',
    'NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS',
    'NEXT_PUBLIC_AUDIO_SAMPLE_RATE',
    'NEXT_PUBLIC_AUDIO_CHANNELS'
  ];

  numericFields.forEach(key => {
    if (config[key] && isNaN(Number(config[key]))) {
      errors.push(`${key} must be a valid number`);
    }
  });

  // Validate audio sample rate
  if (config.NEXT_PUBLIC_AUDIO_SAMPLE_RATE) {
    const sampleRate = Number(config.NEXT_PUBLIC_AUDIO_SAMPLE_RATE);
    if (sampleRate < 8000 || sampleRate > 48000) {
      errors.push('NEXT_PUBLIC_AUDIO_SAMPLE_RATE must be between 8000 and 48000');
    }
  }

  // Validate audio channels
  if (config.NEXT_PUBLIC_AUDIO_CHANNELS) {
    const channels = Number(config.NEXT_PUBLIC_AUDIO_CHANNELS);
    if (channels < 1 || channels > 2) {
      errors.push('NEXT_PUBLIC_AUDIO_CHANNELS must be 1 or 2');
    }
  }

  return {
    exists: true,
    valid: errors.length === 0,
    errors,
    config
  };
}

function checkEnvironmentSetup() {
  log('🔍 Validating Voice Integration Configuration...', 'blue');
  log('', 'reset');

  const nodeEnv = process.env.NODE_ENV || 'development';
  log(`Environment: ${nodeEnv}`, 'yellow');

  // Check for environment files
  const envFiles = [
    '.env.local',
    '.env.example',
    nodeEnv === 'production' ? '.env.production' : null
  ].filter(Boolean);

  let hasValidConfig = false;
  let allErrors = [];

  envFiles.forEach(file => {
    log(`\nChecking ${file}...`, 'blue');
    const result = validateEnvironmentFile(file);
    
    if (!result.exists) {
      log(`  ❌ ${file} not found`, 'red');
      if (file === '.env.local') {
        log(`  💡 Copy .env.example to .env.local and configure for your environment`, 'yellow');
      }
    } else if (result.valid) {
      log(`  ✅ ${file} is valid`, 'green');
      hasValidConfig = true;
    } else {
      log(`  ❌ ${file} has errors:`, 'red');
      result.errors.forEach(error => {
        log(`    - ${error}`, 'red');
      });
      allErrors.push(...result.errors);
    }
  });

  // Check if .env.local exists for development
  if (nodeEnv === 'development' && !fs.existsSync('.env.local')) {
    log('\n⚠️  Development Setup Required:', 'yellow');
    log('  1. Copy .env.example to .env.local', 'yellow');
    log('  2. Configure backend URLs for your development environment', 'yellow');
    log('  3. Run this script again to validate', 'yellow');
    return false;
  }

  log('\n' + '='.repeat(50), 'blue');
  
  if (hasValidConfig && allErrors.length === 0) {
    log('✅ Configuration validation passed!', 'green');
    log('🚀 Voice integration is ready to use', 'green');
    return true;
  } else {
    log('❌ Configuration validation failed!', 'red');
    log('Please fix the errors above before starting the application', 'red');
    return false;
  }
}

function setupDevelopmentEnvironment() {
  if (fs.existsSync('.env.local')) {
    log('✅ .env.local already exists', 'green');
    return;
  }

  if (!fs.existsSync('.env.example')) {
    log('❌ .env.example not found', 'red');
    return;
  }

  log('📋 Creating .env.local from .env.example...', 'blue');
  
  try {
    const exampleContent = fs.readFileSync('.env.example', 'utf8');
    fs.writeFileSync('.env.local', exampleContent);
    log('✅ .env.local created successfully', 'green');
    log('💡 Please review and update the configuration in .env.local', 'yellow');
  } catch (error) {
    log(`❌ Failed to create .env.local: ${error.message}`, 'red');
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--setup')) {
    setupDevelopmentEnvironment();
    return;
  }

  const isValid = checkEnvironmentSetup();
  
  if (!isValid) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironmentFile,
  checkEnvironmentSetup,
  setupDevelopmentEnvironment
};