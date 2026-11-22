import { createSprite } from './animation.mjs';
import { alarmAudio } from './organizer-catalog.mjs';

const api = window.stone;
const $ = id => document.getElementById(id);
const card = $('alert-card');
const snooze = $('alert-snooze');
const dismiss = $('alert-dismiss');
const sprite = createSprite($('alert-sprite-box'), $('alert-sprite'));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const pet = {
  scale: 0.76, x: 85, y: 61, time: 0, look: 0, motion: 0, stride: 0, sleepBlend: 0,
  happyUntil: 0, nextBlink: Infinity, effectAt: -Infinity, tilt: 0, equipped: {}
};
let current;
let audio;
let start;

function show(alert) {
  if (!alert) return;
  const alarm = alert.kind === 'alarm';
  const changed = current?.id !== alert.id;
  current = alert;
  pet.equipped = alert.equipped ?? {};
  card.dataset.kind = alert.kind;
  card.hidden = false;
  $('alert-title').textContent = alarm ? 'Будильник' : 'Напоминание';
  $('alert-message').textContent = alert.text;
  $('alert-time').textContent = time.format(alert.dueAt);
  $('alert-time').dateTime = new Date(alert.dueAt).toISOString();
  snooze.hidden = !alarm;
  dismiss.textContent = alarm ? 'Отключить' : 'Понятно';
  if (!changed && (!alarm || audio?.src.endsWith('/alarm-' + alert.sound + '.wav'))) return;
  $('alert-error').textContent = '';
  start = performance.now();
  audio?.pause();
  if (alarm) {
    audio = alarmAudio(alert.sound);
    audio.loop = true;
    audio.play().catch(() => {
      if (current?.id === alert.id) $('alert-error').textContent = 'Не удалось воспроизвести сигнал.';
    });
    dismiss.focus({ preventScroll: true });
  }
}

async function respond(action) {
  if (!current) return;
  snooze.disabled = dismiss.disabled = true;
  try {
    await api.alertAction(current.id, action);
  } catch {
    $('alert-error').textContent = 'Не удалось завершить уведомление.';
  } finally {
    snooze.disabled = dismiss.disabled = false;
  }
}
snooze.addEventListener('click', () => respond('snooze'));
dismiss.addEventListener('click', () => respond('dismiss'));
api.onAlert(show);
api.alert().then(show).catch(() => {});

function animate(now) {
  if (current) {
    pet.time = (now - start) / 1000;
    const ringing = current.kind === 'alarm';
    pet.tilt = ringing && !reducedMotion.matches ? Math.sin(pet.time * 18) * 0.17 : 0;
    pet.happyUntil = !ringing && pet.time < 0.9 ? 0.9 : 0;
    sprite.paint(pet);
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
