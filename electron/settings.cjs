const path = require('node:path');
const { readJson, writeJson } = require('./storage.cjs');

const petModes = ['overlay', 'widget', 'full'];
const startupModes = ['default', 'last', 'welcome', ...petModes, 'tray'];
const preferences = {
  fps: { default: 30, valid: value => [20, 30, 60].includes(value) },
  brightness: { default: 100, valid: value => Number.isInteger(value) && value >= 40 && value <= 100 },
  size: { default: 'medium', valid: value => ['small', 'medium', 'large'].includes(value) },
  volume: { default: 100, valid: value => Number.isInteger(value) && value >= 0 && value <= 100 },
  startupMode: { default: 'default', valid: value => startupModes.includes(value) },
  autostart: { default: false, valid: value => typeof value === 'boolean' }
};

function loadSettings(userData) {
  const file = path.join(userData, 'settings.json');
  const saved = readJson(file);
  let state = {
    roaming: typeof saved.roaming === 'boolean' ? saved.roaming : true,
    mode: petModes.includes(saved.mode) ? saved.mode : 'welcome',
    ...Object.fromEntries(Object.entries(preferences).map(([key, rule]) =>
      [key, rule.valid(saved[key]) ? saved[key] : rule.default]
    ))
  };

  return {
    get roaming() { return state.roaming; },
    get mode() { return state.mode; },
    get autostart() { return state.autostart; },
    get volume() { return state.volume; },
    presentation() {
      return Object.fromEntries(Object.keys(preferences).map(key => [key, state[key]]));
    },
    startupWindow(atLogin) {
      if (state.startupMode === 'default' && atLogin) return null;
      if (['default', 'last'].includes(state.startupMode)) return state.mode;
      return state.startupMode === 'tray' ? null : state.startupMode;
    },
    update(patch) {
      const next = { ...state, ...patch };
      if (Object.keys(patch).every(key => next[key] === state[key])) return;
      writeJson(file, next);
      state = next;
    }
  };
}

function validatePreference(key, value) {
  if (!Object.hasOwn(preferences, key) || !preferences[key].valid(value)) {
    throw new TypeError('Invalid preference');
  }
}

module.exports = { loadSettings, petModes, validatePreference };
