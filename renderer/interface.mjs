import { activities, createActivities } from './activities.mjs';
import { createSprite } from './animation.mjs';
import { landscape, paintIcon } from './art.mjs';
import { care, clothes, needs, periods, rooms, trips } from './catalog.mjs';
import { games, startGame } from './games.mjs';
import { Pet } from './pet.mjs';

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'welcome';
const api = window.stone;
const select = selector => document.querySelector(selector);
document.body.dataset.mode = mode;

for (const element of document.querySelectorAll('[data-view]')) {
  element.hidden = !element.dataset.view.split(' ').includes(mode);
}
for (const button of document.querySelectorAll('button[data-mode]')) {
  button.addEventListener('click', () => api.showMode(button.dataset.mode));
}
for (const button of ['#mode-menu', '#panel-modes']) {
  select(button).addEventListener('click', () => api.showMenu());
}

for (const button of document.querySelectorAll('[data-organizer]')) {
  button.addEventListener('click', () => api.openOrganizer(button.dataset.organizer));
}

const stage = select('#stage');
const petButton = select('#pet');
const pet = new Pet(mode, params.get('roaming') !== 'false');
const sprite = createSprite(petButton, select('#sprite'));
const roaming = select('#roaming');
const settingsError = select('#settings-error');
const landscapeCanvas = select('#landscape');
const scenery = landscapeCanvas.getContext('2d');
const panel = select('#pet-panel');
let state;
let lastPose;
let lastHitTime = -Infinity;
let lastHitArea = '';

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
  const bounds = stage.getBoundingClientRect();
  const x = event.clientX - bounds.left - stage.clientLeft;
  const y = event.clientY - bounds.top - stage.clientTop;
  if (!area.some(rect =>
    x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height
  )) return;

  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: pet.x, originY: pet.y, moved: false };
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
  if (!moved && event.type === 'pointerup') api.petCommand('stroke');
  if (petButton.hasPointerCapture(id)) petButton.releasePointerCapture(id);
}
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  petButton.addEventListener(event, endPointer);
}
window.addEventListener('blur', endPointer);
petButton.addEventListener('click', event => {
  if (event.detail === 0) api.petCommand('stroke');
});
petButton.addEventListener('contextmenu', event => {
  event.preventDefault();
  if (mode === 'overlay' || mode === 'widget') showPanel();
  else api.showMenu();
});

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function makeButton(text, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  return button;
}

function iconButton(id, name, description) {
  const button = makeButton('', 'icon-button');
  const icon = document.createElement('canvas');
  icon.width = icon.height = 40;
  icon.setAttribute('aria-hidden', 'true');
  paintIcon(icon, id);
  const text = document.createElement('span');
  text.textContent = name;
  if (description) {
    const detail = document.createElement('small');
    detail.textContent = description;
    text.append(detail);
  }
  button.append(icon, text);
  return button;
}

const meters = Object.entries(needs).map(([id, label]) => {
  const wrapper = document.createElement('label');
  wrapper.className = 'meter-label';
  wrapper.textContent = label;
  const score = document.createElement('span');
  score.setAttribute('aria-hidden', 'true');
  const meter = document.createElement('meter');
  meter.setAttribute('aria-label', label);
  meter.max = 100;
  meter.low = 35;
  meter.high = 60;
  meter.optimum = 100;
  wrapper.append(score, meter);
  select('#needs').append(wrapper);
  return { id, score, meter };
});

for (const [id, item] of Object.entries(care)) {
  const button = iconButton(id, item.name);
  button.dataset.care = id;
  button.addEventListener('click', () => {
    api.petCommand('care', id);
    if (id === 'water' || id === 'steam') {
      const file = id === 'water' ? 'sip' : 'puff';
      const sound = new Audio(new URL('../assets/sounds/' + file + '.wav', import.meta.url));
      sound.volume = 0.34;
      sound.play().catch(() => {});
    }
    if (mode !== 'full') hidePanel();
  });
  select('#care-buttons').append(button);
}

const sleepButton = select('#sleep');
sleepButton.addEventListener('click', () => {
  api.petCommand('sleep');
  if (mode !== 'full') hidePanel();
});

const wardrobe = Object.entries(clothes).map(([id, item]) => {
  const button = iconButton(id, item.name, item.from ? trips[item.from].name : '');
  button.dataset.item = id;
  button.addEventListener('click', () => api.petCommand('equip', id));
  select('#wardrobe').append(button);
  return { id, button };
});

function setupSelect(id, options) {
  const input = select('#' + id);
  for (const [value, label] of Object.entries(options)) input.add(new Option(label, value));
  input.addEventListener('change', () => api.petCommand(id, input.value));
  return input;
}
const room = setupSelect('room', rooms);
const clock = setupSelect('clock', { auto: 'По системному времени', ...periods });
select('#room-field').hidden = mode === 'overlay';

const tripButtons = Object.entries(trips).map(([id, destination]) => {
  const button = makeButton(destination.name, 'trip-option');
  const detail = document.createElement('small');
  detail.textContent = destination.duration + ' с · ' + clothes[destination.item].name;
  button.append(detail);
  button.dataset.trip = id;
  button.addEventListener('click', () => {
    api.petCommand('trip', id);
    if (mode !== 'full') hidePanel();
  });
  select('#trip-options').append(button);
  return button;
});
const returnHome = select('#return-home');
returnHome.addEventListener('click', () => api.petCommand('return'));

const openButton = select('#open-panel');
const closeButton = select('#close-panel');
const tabs = [...document.querySelectorAll('[data-tab]')];
const pages = [...document.querySelectorAll('[data-panel]')];
const activityCanvas = select('#activity-scene');
const activityStatus = select('#activity-status');
const stopButton = select('#stop-activity');
const gamePlayer = select('#game-player');
const gameOptions = select('#game-options');
const gameBoard = select('#game-board');
const theater = createActivities(activityCanvas, () => api.petCommand('game', 20), () => pet.equipped);
let stopGame;
let activeButton;
let theaterRunning = false;
let currentTab = 'care';

function selectTab(id) {
  if (id !== currentTab) finishActivity(false);
  currentTab = id;
  for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.tab === id));
  for (const page of pages) page.hidden = page.dataset.panel !== id;
}

function showPanel() {
  if (mode === 'welcome' || !state) return;
  panel.hidden = false;
  openButton.setAttribute('aria-expanded', 'true');
  if (mode === 'overlay') {
    panel.dataset.side = pet.bounds && pet.x > pet.bounds.width / 2 ? 'left' : 'right';
    publishHitArea();
    api.setPanelOpen(true);
  }
  tabs.find(tab => tab.dataset.tab === currentTab).focus();
}

function hidePanel() {
  if (panel.hidden || mode === 'full') return;
  finishActivity(false);
  panel.hidden = true;
  openButton.setAttribute('aria-expanded', 'false');
  publishHitArea();
  if (mode === 'overlay') api.setPanelOpen(false);
  if (mode === 'widget') openButton.focus();
}

for (const tab of tabs) tab.addEventListener('click', () => selectTab(tab.dataset.tab));
openButton.addEventListener('click', () => panel.hidden ? showPanel() : hidePanel());
closeButton.addEventListener('click', hidePanel);
api.onOpenPanel(showPanel);
if (mode === 'full') {
  select('#panel-title').textContent = 'Уход и занятия';
  panel.hidden = false;
}

function finishActivity(focus = true) {
  if (!activeButton) return;
  stopGame?.();
  stopGame = null;
  if (theaterRunning) theater.stop();
  theaterRunning = false;
  api.setActivity(false);
  gamePlayer.hidden = true;
  gameOptions.hidden = false;
  gameBoard.replaceChildren();
  if (focus) activeButton.focus();
  activeButton = null;
}

function addActivity({ id, name, description }, interactive) {
  const button = makeButton(name, 'game-option');
  if (description) {
    const detail = document.createElement('small');
    detail.textContent = description;
    button.append(detail);
  }
  button.dataset.game = id;
  button.addEventListener('click', () => {
    activeButton = button;
    api.setActivity(true);
    gameOptions.hidden = true;
    gamePlayer.hidden = false;
    activityStatus.textContent = description ?? name;
    activityCanvas.hidden = interactive;
    stopButton.textContent = 'Закончить';
    if (interactive) {
      stopGame = startGame(id, gameBoard, reward => {
        api.petCommand('game', reward);
        api.setActivity(false);
        stopButton.textContent = 'К играм';
        stopButton.focus();
      });
    } else {
      theaterRunning = true;
      theater.start(id);
      activityCanvas.focus();
    }
  });
  gameOptions.append(button);
}

for (const game of games) addActivity(game, true);
for (const activity of activities) {
  addActivity({ id: activity.id, name: activity.label, description: activity.hint }, false);
}
stopButton.addEventListener('click', () => finishActivity());
window.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || panel.hidden) return;
  if (activeButton) finishActivity();
  else hidePanel();
});

const stageStatus = select('#stage-status');
const deviceStatus = select('#device-status');
const tripStatus = select('#trip-status');
const placeName = select('#place-name');
const timeName = select('#time-name');

function update(next) {
  const wasReady = Boolean(state);
  state = next;
  pet.update(next);
  const place = state.trip?.id ?? state.room;
  stage.dataset.phase = state.phase;
  if (!wasReady || stage.dataset.room !== place) {
    stage.dataset.room = place;
    scenery.clearRect(0, 0, landscapeCanvas.width, landscapeCanvas.height);
    landscape(scenery, place);
  }
  setText(placeName, state.trip ? trips[place].name : rooms[place]);
  setText(timeName, periods[state.phase]);
  const status = state.sleeping ? 'Камешек тихонько спит.' : state.status || state.tripLog || 'Камешек дома.';
  setText(stageStatus, status);
  setText(deviceStatus, [periods[state.phase], status].filter(Boolean).join(' · '));
  const tripText = state.trip
    ? trips[place].name + ' · ещё ' + Math.max(0, Math.ceil((state.trip.endsAt - state.updatedAt) / 1000)) + ' с'
    : state.tripLog;
  setText(tripStatus, tripText);
  returnHome.hidden = !state.trip;
  for (const button of tripButtons) button.disabled = Boolean(state.trip);
  sleepButton.disabled = Boolean(state.trip);
  setText(sleepButton, state.sleeping ? 'Разбудить' : 'Уложить спать');
  for (const { id, meter, score } of meters) {
    meter.value = Math.round(state.needs[id]);
    setText(score, String(meter.value));
  }
  for (const { id, button } of wardrobe) {
    button.disabled = !state.owned.includes(id);
    button.setAttribute('aria-pressed', String(state.equipped[clothes[id].slot] === id));
  }
  room.value = state.room;
  clock.value = state.clock;
}
api.onPetState(update);

function publishHitArea() {
  if (mode !== 'overlay' || !state || !lastPose) return;
  const area = sprite.hitArea(pet, lastPose);
  if (!panel.hidden) {
    const { x, y, width, height } = panel.getBoundingClientRect();
    area.push({ x, y, width, height });
  }
  const key = JSON.stringify(area);
  if (key !== lastHitArea) {
    api.setHitArea(area);
    lastHitArea = key;
  }
}

let previousTime;
function animate(time) {
  requestAnimationFrame(animate);
  if (pet.sleeping && pet.sleepBlend > 0.98 && !pet.held && time - previousTime < 32) return;
  const dt = Math.min((time - (previousTime ?? time)) / 1000, 0.05);
  previousTime = time;
  if (theaterRunning && !theater.step(dt)) finishActivity();
  if (pet.bounds) {
    pet.step(dt);
    lastPose = sprite.paint(pet);
    if (time - lastHitTime >= 30) {
      publishHitArea();
      lastHitTime = time;
    }
  }
}
requestAnimationFrame(animate);
