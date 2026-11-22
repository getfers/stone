const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { readJson, writeJson } = require('./storage.cjs');
const { sounds } = require('../renderer/organizer-catalog.mjs');

const snoozeMs = 5 * 60 * 1000;
const timestamp = value => Number.isSafeInteger(value) && value > 0 && value <= 8.64e15;
const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const validDays = value => Array.isArray(value) && value.every(day => Number.isInteger(day) && day >= 0 && day < 7);
const validSound = value => typeof value === 'string' && Object.hasOwn(sounds, value);

function nextAlarm(time, days, after) {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date(after);
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
    if (days.length && !days.includes(day.getDay())) continue;
    day.setHours(hour, minute, 0, 0);
    if (day.getTime() > after) return day.getTime();
  }
  throw new RangeError('Could not calculate the next alarm');
}

function createOrganizer(userData, { clock = Date.now } = {}) {
  const file = path.join(userData, 'organizer.json');
  const saved = readJson(file);
  const records = (key, valid) => Array.isArray(saved[key])
    ? saved[key].filter(item => item && typeof item.id === 'string' && valid(item)) : [];
  let state = {
    notes: records('notes', item => typeof item.text === 'string' && (item.at === null || timestamp(item.at))),
    alarms: records('alarms', item => validTime(item.time) && validDays(item.days) && validSound(item.sound) &&
      typeof item.label === 'string' && (item.nextAt === null || timestamp(item.nextAt))),
    alerts: records('alerts', item => ['note', 'alarm'].includes(item.kind) && typeof item.sourceId === 'string' &&
      typeof item.text === 'string' && timestamp(item.dueAt) && (item.kind === 'note' || validSound(item.sound)))
  };

  function commit(next) {
    writeJson(file, next);
    state = next;
  }

  function update(kind, action, { id, ...input } = {}) {
    if (!['notes', 'alarms'].includes(kind)) throw new TypeError('Unknown organizer section');
    const items = state[kind];
    const previous = items.find(item => item.id === id);
    if (id !== undefined && !previous) throw new TypeError('Unknown organizer entry');
    const now = clock();
    let entry;
    if (action === 'save' && kind === 'notes') {
      const text = typeof input.text === 'string' ? input.text.trim() : '';
      if (!text || text.length > 600 || (input.at !== null && !timestamp(input.at))) {
        throw new TypeError('Invalid note');
      }
      if (input.at !== null && input.at <= now && previous?.at !== input.at) {
        throw new RangeError('Reminder must be in the future');
      }
      entry = { id: id ?? randomUUID(), text, at: input.at, fired: previous?.at === input.at && !!previous.fired };
    } else if (action === 'save' && kind === 'alarms') {
      if (!validTime(input.time) || !validDays(input.days) || !validSound(input.sound) ||
          typeof input.label !== 'string' || input.label.length > 100 || typeof input.enabled !== 'boolean') {
        throw new TypeError('Invalid alarm');
      }
      const days = [...new Set(input.days)].sort();
      const unchanged = previous?.time === input.time && previous.days.join() === days.join();
      const active = previous && (previous.nextAt || previous.snoozeAt ||
        state.alerts.some(alert => alert.sourceId === id));
      entry = {
        id: id ?? randomUUID(), time: input.time, days, sound: input.sound, label: input.label.trim(),
        nextAt: input.enabled ? (unchanged && active ? previous.nextAt : nextAlarm(input.time, days, now)) : null,
        snoozeAt: input.enabled && unchanged ? previous.snoozeAt : null
      };
    } else if (action === 'toggle' && kind === 'alarms' && previous) {
      entry = {
        ...previous,
        nextAt: previous.nextAt || previous.snoozeAt || state.alerts.some(alert => alert.sourceId === id)
          ? null : nextAlarm(previous.time, previous.days, now),
        snoozeAt: null
      };
    } else if (action !== 'delete' || !previous) {
      throw new TypeError('Unknown organizer action');
    }

    const next = previous ? items.flatMap(item => item === previous ? (entry ? [entry] : []) : [item])
      : [...items, entry];
    const alerts = state.alerts.flatMap(alert => {
      if (alert.sourceId !== id) return [alert];
      if (entry && kind === 'notes' && entry.fired) return [{ ...alert, text: entry.text }];
      if (entry && kind === 'alarms' && action === 'save' && input.enabled) {
        return [{ ...alert, text: entry.label || 'Будильник', sound: entry.sound }];
      }
      return [];
    });
    commit({ ...state, [kind]: next, alerts });
  }

  function collect() {
    const now = clock();
    const alerts = [...state.alerts];
    const notes = state.notes.map(note => {
      if (!note.at || note.fired || note.at > now) return note;
      alerts.push({ id: randomUUID(), kind: 'note', sourceId: note.id, text: note.text, dueAt: note.at });
      return { ...note, fired: true };
    });
    const alarms = state.alarms.map(alarm => {
      const scheduled = alarm.nextAt && alarm.nextAt <= now;
      const snoozed = alarm.snoozeAt && alarm.snoozeAt <= now;
      if (!scheduled && !snoozed) return alarm;
      const ringing = alerts.some(alert => alert.kind === 'alarm' && alert.sourceId === alarm.id);
      if (!ringing) {
        alerts.push({
          id: randomUUID(), kind: 'alarm', sourceId: alarm.id,
          text: alarm.label || 'Будильник', sound: alarm.sound,
          dueAt: snoozed ? alarm.snoozeAt : alarm.nextAt
        });
      }
      return {
        ...alarm,
        snoozeAt: null,
        nextAt: scheduled ? (alarm.days.length ? nextAlarm(alarm.time, alarm.days, now) : null) : alarm.nextAt
      };
    });
    if (alerts.length === state.alerts.length &&
        notes.every((item, i) => item === state.notes[i]) &&
        alarms.every((item, i) => item === state.alarms[i])) return false;
    commit({ notes, alarms, alerts: alerts.sort((a, b) => a.dueAt - b.dueAt) });
    return true;
  }

  function respond(id, action) {
    const alert = current();
    if (!alert || alert.id !== id) return false;
    if (action !== 'dismiss' && (action !== 'snooze' || alert.kind !== 'alarm')) {
      throw new TypeError('Invalid alert response');
    }
    const alarms = action === 'snooze' ? state.alarms.map(alarm =>
      alarm.id === alert.sourceId ? { ...alarm, snoozeAt: clock() + snoozeMs } : alarm
    ) : state.alarms;
    commit({ ...state, alarms, alerts: state.alerts.filter(item => item.id !== id) });
    return true;
  }

  function current() {
    return state.alerts.find(item => item.kind === 'alarm') ?? state.alerts[0];
  }

  return {
    update, collect, respond, current,
    snapshot: () => ({
      notes: state.notes, alarms: state.alarms,
      ringing: state.alerts.filter(alert => alert.kind === 'alarm').map(alert => alert.sourceId)
    })
  };
}

module.exports = { createOrganizer, nextAlarm, snoozeMs };
