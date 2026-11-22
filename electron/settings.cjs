const fs = require('node:fs');
const path = require('node:path');

function loadSettings(userData) {
  const file = path.join(userData, 'settings.json');
  let roaming = true;

  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof saved?.roaming === 'boolean') roaming = saved.roaming;
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Could not read settings:', error.message);
  }

  return {
    get roaming() {
      return roaming;
    },
    setRoaming(value) {
      if (value === roaming) return;
      fs.mkdirSync(userData, { recursive: true });
      const temp = file + '.tmp';
      fs.writeFileSync(temp, JSON.stringify({ roaming: value }) + '\n');
      fs.renameSync(temp, file);
      roaming = value;
    }
  };
}

module.exports = { loadSettings };
