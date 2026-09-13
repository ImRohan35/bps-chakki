const fs = require('fs');
const path = require('path');

/**
 * Helper to update key-value pairs in backend/.env file
 * and in the current runtime process.env
 */
function updateEnv(updates = {}) {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return false;
    let content = fs.readFileSync(envPath, 'utf-8');

    for (const [key, val] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${val}`);
      } else {
        content = content.trim() + `\n${key}=${val}\n`;
      }
      process.env[key] = String(val);
    }

    fs.writeFileSync(envPath, content, 'utf-8');
    return true;
  } catch (err) {
    console.error('Error updating .env file:', err);
    return false;
  }
}

module.exports = { updateEnv };
