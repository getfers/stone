import { createSprite } from './animation.mjs';
import { createFrameLoop } from './frame-loop.mjs';
import { alarmAudio, alarmVolume } from './organizer-catalog.mjs';

import { locale, onLanguage, setLanguage, setMessage, t } from './localization.mjs';

const api = window.stone;
const $ = id => document.getElementById(id);
const card = $('alert-card');
const snooze = $('alert-snooze');
const dismiss = $('alert-dismiss');
const sprite = createSprite($('alert-sprite-box'), $('alert-sprite'));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pet = {
  scale: 0.76, x: 85, y: 61, time: 0, look: 0, motion: 0, stride: 0, sleepBlend: 0,
  happyUntil: 0, nextBlink: Infinity, effectAt: -Infinity, tilt: 0, equipped: {}
};
let current;
let audio;
let start;

function localizeAlert() {
  if (!current) return;
  const alarm = current.kind === 'alarm';
  $('alert-title').textContent = t(alarm ? 'Будильник' : 'Напоминание');
  $('alert-message').textContent = current.defaultLabel ? t('Будильник') : current.text;
  const time = new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' });
  $('alert-time').textContent = time.format(current.dueAt);
  dismiss.textContent = t(alarm ? 'Отключить' : 'Понятно');
}

function show(alert) {
  if (!alert) return;
  const alarm = alert.kind === 'alarm';
  const changed = current?.id !== alert.id;
  current = alert;
  pet.equipped = alert.equipped ?? {};
  card.dataset.kind = alert.kind;
  card.hidden = false;
  localizeAlert();
  $('alert-time').dateTime = new Date(alert.dueAt).toISOString();
  snooze.hidden = !alarm;
  if (!changed && (!alarm || audio?.src.endsWith('/alarm-' + alert.sound + '.wav'))) return;
  setMessage($('alert-error'), '');
  start = performance.now();
  audio?.pause();
  audio = undefined;
  if (alarm) {
    audio = alarmAudio(alert.sound, alert.volume);
    audio.loop = true;
    audio.play().catch(() => {
      if (current?.id === alert.id) setMessage($('alert-error'), 'Не удалось воспроизвести сигнал.');
    });
    dismiss.focus({ preventScroll: true });
  }
  syncAnimation();
}

async function respond(action) {
  if (!current) return;
  snooze.disabled = dismiss.disabled = true;
  try {
    await api.alertAction(current.id, action);
  } catch {
    setMessage($('alert-error'), 'Не удалось завершить уведомление.');
  } finally {
    snooze.disabled = dismiss.disabled = false;
  }
}
snooze.addEventListener('click', () => respond('snooze'));
dismiss.addEventListener('click', () => respond('dismiss'));
api.onAlert(show);
api.alert().then(show).catch(() => {});

const frames = createFrameLoop((_dt, now) => {
  pet.time = (now - start) / 1000;
  const ringing = current.kind === 'alarm';
  pet.tilt = ringing && !reducedMotion.matches ? Math.sin(pet.time * 18) * 0.17 : 0;
  pet.happyUntil = !ringing && pet.time < 0.9 ? 0.9 : 0;
  sprite.paint(pet);
});

function syncAnimation() {
  frames.setRunning(Boolean(current) && document.visibilityState === 'visible');
}
document.addEventListener('visibilitychange', syncAnimation);

onLanguage(localizeAlert);

function applyPreferences(settings) {
  setLanguage(settings.language);
  frames.setFps(settings.fps);
  if (audio) audio.volume = alarmVolume(settings.volume);
}
api.onPreferences(applyPreferences);
api.preferences().then(applyPreferences).catch(() => {});
