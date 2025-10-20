// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

// Load .env.local
const envLocal = loadEnvFile(path.join(process.cwd(), '.env.local'));

// Set environment variables
Object.keys(envLocal).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = envLocal[key];
  }
});

module.exports = { loadEnvFile };