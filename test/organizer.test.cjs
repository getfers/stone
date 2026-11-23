const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createOrganizer, nextAlarm, snoozeMs } = require('../electron/organizer.cjs');
const { loadSettings } = require('../electron/settings.cjs');

const monday = new Date(2026, 10, 23, 7);
const minute = 60000;

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stone-organizer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let now = +monday;
  return {
    dir,
    open: () => createOrganizer(dir, { clock: () => now }),
    advance: amount => { now += amount; }
  };
}

test('notes support editing, scheduling, removal and a single durable delivery', t => {
  const { open, advance } = fixture(t);
  let organizer = open();
  organizer.update('notes', 'save', { text: 'Plain note', at: null });
  const [plain] = organizer.snapshot().notes;
  organizer.update('notes', 'save', { id: plain.id, text: 'Edited', at: +monday + minute });
  assert.equal(organizer.collect(), false);
  advance(minute);
  organizer = open();
  assert.equal(organizer.collect(), true);
  assert.equal(organizer.current().text, 'Edited');
  const alert = organizer.current();
  organizer = open();
  assert.equal(organizer.current().id, alert.id);
  assert.equal(organizer.respond(alert.id, 'dismiss'), true);
  assert.equal(organizer.collect(), false);
  organizer.update('notes', 'save', { id: plain.id, text: 'Edited again', at: +monday + minute });
  assert.equal(organizer.snapshot().notes[0].fired, true);
  assert.equal(organizer.collect(), false);
  organizer.update('notes', 'delete', { id: plain.id });
  assert.deepEqual(open().snapshot().notes, []);
});

test('alarms take precedence and snooze once for exactly five minutes across restart', t => {
  const { open, advance } = fixture(t);
  let organizer = open();
  organizer.update('notes', 'save', { text: 'Reminder', at: +monday + minute });
  organizer.update('alarms', 'save', { time: '07:01', days: [], label: 'Wake up', sound: 'chime', enabled: true });
  advance(minute);
  organizer.collect();
  const alarm = organizer.current();
  assert.equal(alarm.kind, 'alarm');
  assert.equal(organizer.snapshot().alarms[0].nextAt, null);
  assert.equal(organizer.respond(alarm.id, 'snooze'), true);
  assert.equal(organizer.current().kind, 'note');
  organizer.respond(organizer.current().id, 'dismiss');
  organizer = open();
  advance(snoozeMs - 1);
  assert.equal(organizer.collect(), false);
  advance(1);
  assert.equal(organizer.collect(), true);
  assert.equal(organizer.current().sourceId, alarm.sourceId);
  assert.equal(organizer.current().dueAt, +monday + minute + snoozeMs);
  organizer.respond(organizer.current().id, 'dismiss');
  assert.equal(organizer.collect(), false);
  assert.equal(organizer.current(), undefined);
});

test('weekly scheduling observes local days and editing a ringing alarm preserves it', t => {
  const { open, advance } = fixture(t);
  const organizer = open();
  const input = { time: '07:01', days: [1, 3, 3, 5], label: 'Before work', sound: 'pulse', enabled: true };
  organizer.update('alarms', 'save', input);
  const [saved] = organizer.snapshot().alarms;
  assert.deepEqual(saved.days, [1, 3, 5]);
  advance(minute);
  organizer.collect();
  const alarm = organizer.current();
  const nextAt = +new Date(2026, 10, 25, 7, 1);
  assert.equal(organizer.snapshot().alarms[0].nextAt, nextAt);
  assert.equal(nextAlarm('07:01', [1], +monday + minute), +new Date(2026, 10, 30, 7, 1));
  organizer.update('alarms', 'save', { ...input, id: saved.id, label: 'Edited', sound: 'morning' });
  assert.equal(organizer.current().id, alarm.id);
  assert.equal(organizer.current().text, 'Edited');
  assert.equal(organizer.snapshot().alarms[0].nextAt, nextAt);
  organizer.update('alarms', 'toggle', { id: saved.id });
  assert.equal(organizer.current(), undefined);
  assert.equal(organizer.snapshot().alarms[0].nextAt, null);
});

test('legacy settings are migrated and the last intact data is available after file damage', t => {
  const { dir } = fixture(t);
  const file = path.join(dir, 'settings.json');
  fs.writeFileSync(file, '{"roaming":false}');
  const settings = loadSettings(dir);
  assert.equal(settings.mode, 'welcome');
  assert.equal(settings.startupWindow(false), 'welcome');
  assert.equal(settings.startupWindow(true), null);
  assert.deepEqual(settings.presentation(), {
    fps: 30, brightness: 100, size: 'medium', volume: 100, startupMode: 'default', autostart: false
  });
  settings.update({ mode: 'widget' });
  settings.update({ fps: 60, brightness: 78, size: 'large', volume: 0, startupMode: 'overlay' });
  settings.update({ autostart: true });
  const reopened = loadSettings(dir);
  assert.deepEqual(reopened.presentation(), {
    fps: 60, brightness: 78, size: 'large', volume: 0, startupMode: 'overlay', autostart: true
  });
  assert.equal(reopened.startupWindow(true), 'overlay');
  assert.equal(reopened.startupWindow(false), 'overlay');
  fs.writeFileSync(file, '{');
  const recovered = loadSettings(dir);
  assert.equal(recovered.mode, 'widget');
  assert.equal(recovered.roaming, false);
});
