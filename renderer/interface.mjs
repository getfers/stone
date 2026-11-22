import { activities, createActivities } from './activities.mjs';
import { createSprite } from './animation.mjs';
import { Pet } from './pet.mjs';

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'welcome';
const api = window.stone;
document.body.dataset.mode = mode;

for (const element of document.querySelectorAll('[data-view]')) {
  element.hidden = !element.dataset.view.split(' ').includes(mode);
}
for (const button of document.querySelectorAll('button[data-mode]')) {
  button.addEventListener('click', () => api.showMode(button.dataset.mode));
}
document.querySelector('#mode-menu').addEventListener('click', () => api.showMenu());

const stage = document.querySelector('#stage');
const petButton = document.querySelector('#pet');
const pet = new Pet(mode, params.get('roaming') !== 'false');
const sprite = createSprite(petButton, document.querySelector('#sprite'));
const roaming = document.querySelector('#roaming');
const settingsError = document.querySelector('#settings-error');
roaming.checked = pet.roaming;

api.onRoamingChanged(value => {
  roaming.checked = value;
  pet.setRoaming(value);
});
roaming.addEventListener('change', async () => {
  roaming.disabled = true;
  settingsError.textContent = '';
  try {
    roaming.checked = await api.setRoaming(roaming.checked);
  } catch {
    roaming.checked = pet.roaming;
    settingsError.textContent = 'Не удалось сохранить настройку';
  } finally {
    roaming.disabled = false;
  }
});

new ResizeObserver(() => {
  const { clientWidth, clientHeight } = stage;
  if (clientWidth && clientHeight) pet.resize(clientWidth, clientHeight);
}).observe(stage);

let pointer;
petButton.addEventListener('pointerdown', event => {
  if (event.button !== 0 || pointer || !pet.bounds || !lastPose) return;
  const area = sprite.hitArea(pet, lastPose);
  const x = event.clientX;
  const y = event.clientY;
  const bounds = stage.getBoundingClientRect();
  if (!area.some(rect =>
    x >= bounds.x + rect.x && x < bounds.x + rect.x + rect.width &&
    y >= bounds.y + rect.y && y < bounds.y + rect.y + rect.height
  )) return;

  pointer = { id: event.pointerId, x, y, originX: pet.x, originY: pet.y, moved: false };
  petButton.setPointerCapture(pointer.id);
  pet.hold();
  if (mode === 'overlay') api.setPointerHeld(true);
});
petButton.addEventListener('pointermove', event => {
  if (event.pointerId !== pointer?.id) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  if (!pointer.moved && Math.hypot(dx, dy) < 4) return;
  pointer.moved = true;
  pet.drag(pointer.originX + dx, pointer.originY + dy);
});

function endPointer(event) {
  if (!pointer || (event.pointerId !== undefined && event.pointerId !== pointer.id)) return;
  const { id, moved } = pointer;
  pointer = null;
  pet.release();
  if (mode === 'overlay') api.setPointerHeld(false);
  if (!moved && event.type === 'pointerup') pet.pet();
  if (petButton.hasPointerCapture(id)) petButton.releasePointerCapture(id);
}
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  petButton.addEventListener(event, endPointer);
}
window.addEventListener('blur', endPointer);
petButton.addEventListener('click', event => {
  if (event.detail === 0) pet.pet();
});
petButton.addEventListener('contextmenu', event => {
  event.preventDefault();
  api.showMenu();
});

const activityCanvas = document.querySelector('#activity-scene');
const theater = mode === 'full' ? createActivities(activityCanvas) : null;
const activityButtons = document.querySelector('#activity-buttons');
const activityStatus = document.querySelector('#activity-status');
const stopButton = document.querySelector('#stop-activity');
let activeButton;

function finishActivity() {
  if (!activeButton) return;
  const moveFocus = document.activeElement === activityCanvas || document.activeElement === stopButton;
  theater.stop();
  activityStatus.textContent = '';
  activityCanvas.hidden = true;
  stopButton.hidden = true;
  petButton.hidden = false;
  for (const button of activityButtons.children) button.disabled = false;
  if (moveFocus) activeButton.focus();
  activeButton = null;
}

if (theater) {
  for (const { id, label, hint } of activities) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.textContent = label;
    button.addEventListener('click', () => {
      activeButton = button;
      theater.start(id);
      for (const item of activityButtons.children) item.disabled = true;
      activityStatus.textContent = hint ?? label;
      activityCanvas.hidden = false;
      stopButton.hidden = false;
      petButton.hidden = true;
      activityCanvas.focus();
    });
    activityButtons.append(button);
  }

  stopButton.addEventListener('click', finishActivity);
  activityCanvas.addEventListener('keydown', event => {
    if (event.key === 'Escape') finishActivity();
  });
}

let previousTime;
let lastPose;
let lastHitTime = -Infinity;
let lastHitArea = '';
function animate(time) {
  const dt = Math.min((time - (previousTime ?? time)) / 1000, 0.05);
  previousTime = time;

  if (activeButton) {
    if (!theater.step(dt)) finishActivity();
  } else if (pet.bounds) {
    pet.step(dt);
    lastPose = sprite.paint(pet);

    if (mode === 'overlay' && time - lastHitTime >= 30) {
      const area = sprite.hitArea(pet, lastPose);
      const key = JSON.stringify(area);
      if (key !== lastHitArea) {
        api.setHitArea(area);
        lastHitArea = key;
      }
      lastHitTime = time;
    }
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
