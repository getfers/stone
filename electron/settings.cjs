const path = require('node:path');
const { readJson, writeJson } = require('./storage.cjs');

const petModes = ['overlay', 'widget', 'full'];

function loadSettings(userData) {
  const file = path.join(userData, 'settings.json');
  const saved = readJson(file);
  let state = {
    roaming: typeof saved.roaming === 'boolean' ? saved.roaming : true,
    mode: petModes.includes(saved.mode) ? saved.mode : 'welcome',
    autostart: saved.autostart === true
  };

  return {
    get roaming() { return state.roaming; },
    get mode() { return state.mode; },
    get autostart() { return state.autostart; },
    update(patch) {
      const next = { ...state, ...patch };
      if (Object.keys(patch).every(key => next[key] === state[key])) return;
      writeJson(file, next);
      state = next;
    }
  };
}

module.exports = { loadSettings, petModes };
