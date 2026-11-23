import { arcade, startArcade } from './arcade.mjs';
import { activities, createActivities } from './activities.mjs';
import { createSprite } from './animation.mjs';
import { landscape, paintIcon } from './art.mjs';
import { care, clothes, needs, periods, rooms, trips } from './catalog.mjs';
import { createFrameLoop } from './frame-loop.mjs';
import { games, startGame } from './games.mjs';
import { onLanguage, setLanguage, setMessage, t } from './localization.mjs';
import { Pet } from './pet.mjs';
import { createWalk } from './walk.mjs';
import { walks } from './walk-catalog.mjs';

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
select('#open-settings').addEventListener('click', () => api.openSettings());

const stage = select('#stage');
const petButton = select('#pet');
const pet = new Pet(mode, params.get('roaming') !== 'false');
const sprite = createSprite(petButton, select('#sprite'));
const roaming = select('#roaming');
const settingsError = select('#settings-error');
const landscapeCanvas = select('#landscape');
const scenery = mode === 'overlay' ? null : landscapeCanvas.getContext('2d');
const panel = select('#pet-panel');
const panelContent = select('.panel-content');
let state;
let lastPose;
let lastHitTime = -Infinity;
let lastHitArea = '';
let fps = 30;
let volume = 1;
let activeSound;
let sceneSize = 'medium';

roaming.checked = pet.roaming;
api.onRoamingChanged(value => {
  roaming.checked = value;
  pet.setRoaming(value);
});
roaming.addEventListener('change', async () => {
  roaming.disabled = true;
  setMessage(settingsError, '');
  try {
    roaming.checked = await api.setRoaming(roaming.checked);
  } catch {
    roaming.checked = pet.roaming;
    setMessage(settingsError, 'Не удалось сохранить настройку.');
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
  const label = document.createElement('span');
  setMessage(label, name);
  text.append(label);
  if (description) {
    const detail = document.createElement('small');
    setMessage(detail, description);
    text.append(detail);
  }
  button.append(icon, text);
  return button;
}

const meters = Object.entries(needs).map(([id, label]) => {
  const wrapper = document.createElement('label');
  wrapper.className = 'meter-label';
  const name = document.createElement('span');
  name.className = 'meter-name';
  setMessage(name, label);
  wrapper.append(name);
  const score = document.createElement('span');
  score.setAttribute('aria-hidden', 'true');
  const meter = document.createElement('meter');
  meter.dataset.i18nAriaLabel = label;
  meter.setAttribute('aria-label', t(label));
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
      activeSound?.pause();
      if (volume > 0) {
        activeSound = new Audio(new URL('../assets/sounds/' + file + '.wav', import.meta.url));
        activeSound.volume = 0.34 * volume;
        activeSound.play().catch(() => {});
      }
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
  const button = iconButton(id, item.name, item.from ? walks[item.from].name : '');
  button.dataset.item = id;
  button.addEventListener('click', () => api.petCommand('equip', id));
  select('#wardrobe').append(button);
  return { id, button };
});

function setupSelect(id, options) {
  const input = select('#' + id);
  for (const [value, label] of Object.entries(options)) {
    const option = new Option(t(label), value);
    option.dataset.i18n = label;
    input.add(option);
  }
  input.addEventListener('change', () => api.petCommand(id, input.value));
  return input;
}
const room = setupSelect('room', rooms);
const clock = setupSelect('clock', { auto: 'По системному времени', ...periods });
select('#room-field').hidden = mode === 'overlay';

const walkOptions = select('#trip-options');
for (const [id, destination] of Object.entries(walks)) {
  const button = makeButton('', 'trip-option');
  const label = document.createElement('span');
  setMessage(label, destination.name);
  const detail = document.createElement('small');
  setMessage(detail, destination.description);
  button.append(label, detail);
  button.dataset.trip = id;
  button.addEventListener('click', () => api.petCommand('explore', id));
  walkOptions.append(button);
}
const walkPlayer = select('#walk-player');
const walkStage = select('#walk-stage');
const walkScene = select('#walk-scene');
if (mode === 'full') walkStage.append(walkScene);
const walk = createWalk(walkScene, walkPlayer, api, () => pet.equipped, () => sceneSize);
const returnHome = select('#return-home');
returnHome.addEventListener('click', () => api.petCommand('return'));

const openButton = select('#open-panel');
const closeButton = select('#close-panel');
const tabs = [...document.querySelectorAll('[data-tab]')];
const pages = [...document.querySelectorAll('[data-panel]')];
const activityCanvas = select('#activity-scene');
const activityStatus = select('#activity-status');
const activityName = select('#activity-name');
const stopButton = select('#stop-activity');
const gamePlayer = select('#game-player');
const gameOptions = select('#game-options');
const gameBoard = select('#game-board');
const gameStage = select('#game-stage');
let arcadeRunning = false;
let theater;
let gameSession;
let activeButton;
let theaterRunning = false;
let currentTab = 'care';

function selectTab(id) {
  if (id !== currentTab) finishActivity(false);
  currentTab = id;
  for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.tab === id));
  for (const page of pages) page.hidden = page.dataset.panel !== id;
  panelContent.scrollTop = 0;
  syncWalkStage();
}

function showPanel() {
  if (mode === 'welcome' || !state) return;
  panel.hidden = false;
  syncWalkStage();
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
  syncWalkStage();
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
  setMessage(select('#panel-title'), 'Уход и занятия');
  panel.hidden = false;
}

function finishActivity(focus = true) {
  if (!activeButton) return;
  gameSession?.stop();
  gameSession = null;
  if (theaterRunning) theater.stop();
  theaterRunning = arcadeRunning = false;
  api.setActivity(false);
  gamePlayer.hidden = true;
  gameOptions.hidden = false;
  gameBoard.replaceChildren();
  gameStage.hidden = true;
  gamePlayer.append(gameBoard);
  syncWalkStage();
  if (focus) activeButton.focus();
  activeButton = null;
}

function activityFinished(reward) {
  api.petCommand('game', reward);
  api.setActivity(false);
  setMessage(stopButton, 'К играм');
  stopButton.focus();
}

function addActivity(activity, type) {
  const { id, name, description, compactHint } = activity;
  const button = makeButton('', 'game-option');
  const label = document.createElement('span');
  setMessage(label, name);
  button.append(label);
  if (description) {
    const detail = document.createElement('small');
    setMessage(detail, description);
    button.append(detail);
  }
  button.dataset.game = id;
  button.addEventListener('click', () => {
    activeButton = button;
    api.setActivity(true);
    gameOptions.hidden = true;
    gamePlayer.hidden = false;
    panelContent.scrollTop = 0;
    setMessage(activityStatus, (mode === 'widget' && compactHint) || description || name);
    setMessage(activityName, name);
    activityName.hidden = type !== 'arcade';
    activityCanvas.hidden = type !== 'theater';
    setMessage(stopButton, 'Закончить');
    if (type === 'arcade') {
      arcadeRunning = true;
      if (mode === 'full') {
        gameStage.append(gameBoard);
        gameStage.hidden = false;
      }
      syncWalkStage();
      gameSession = startArcade(id, gameBoard, () => pet.equipped, () => sceneSize, activityFinished);
    } else if (type === 'classic') {
      gameSession = startGame(id, gameBoard, activityFinished);
    } else {
      theaterRunning = true;
      theater ??= createActivities(activityCanvas, () => api.petCommand('game', 20), () => pet.equipped);
      theater.start(id);
      activityCanvas.focus();
    }
  });
  gameOptions.append(button);
}

for (const game of arcade) addActivity(game, 'arcade');
for (const game of games) addActivity(game, 'classic');
for (const activity of activities) {
  addActivity({ id: activity.id, name: activity.label, description: activity.hint }, 'theater');
}
stopButton.addEventListener('click', () => finishActivity());
window.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || panel.hidden) return;
  if (activeButton) finishActivity();
  else hidePanel();
});

const stageStatus = select('#stage-status');
const deviceStatus = select('#device-status');
const tripStatus = select('#legacy-trip-status');
const placeName = select('#place-name');
const timeName = select('#time-name');

function syncWalkStage() {
  const visible = Boolean(state?.exploration && currentTab === 'walk' && !panel.hidden);
  walkStage.hidden = mode !== 'full' || !visible;
  if (mode === 'full') select('#home-footer-hint').hidden = visible || arcadeRunning;
  const label = visible ? walks[state.exploration.id].name
    : arcadeRunning ? activityName.dataset.i18n : 'Площадка камешка';
  stage.dataset.i18nAriaLabel = label;
  stage.setAttribute('aria-label', t(label));
  stage.classList.toggle('side-scene', mode === 'overlay' && (visible || arcadeRunning));
}

function legacyLog(text) {
  for (const trip of Object.values(trips)) {
    for (const event of trip.events) {
      if (text === event) return t(event);
      if (text.startsWith(event + ' Находка в гардеробе')) {
        return t(event) + ' ' + t('Находка в гардеробе — «{item}».', { item: t(clothes[trip.item].name) });
      }
    }
  }
  return text;
}

function renderState() {
  if (!state) return;
  const place = state.trip?.id ?? state.room;
  const log = legacyLog(state.tripLog);
  setText(placeName, t(state.trip ? trips[place].name : rooms[place]));
  setText(timeName, t(periods[state.phase]));
  const status = state.sleeping ? t('Камешек тихонько спит.')
    : state.exploration ? t('Камешек на прогулке.')
    : state.status === state.tripLog && log ? log
    : state.status ? t(state.status) : log || t('Камешек дома.');
  setText(stageStatus, status);
  setText(deviceStatus, [t(periods[state.phase]), status].join(' · '));
  const tripText = state.trip ? t('{place} · ещё {seconds} с', {
    place: t(trips[place].name), seconds: Math.max(0, Math.ceil((state.trip.endsAt - state.updatedAt) / 1000))
  }) : log;
  setText(tripStatus, tripText);
  setText(sleepButton, t(state.sleeping ? 'Разбудить' : 'Уложить спать'));
}

function update(next) {
  const wasReady = Boolean(state);
  const changedWalk = state?.exploration?.token !== next.exploration?.token;
  state = next;
  pet.update(next);
  updateFps();
  const place = state.trip?.id ?? state.room;
  if (stage.dataset.phase !== state.phase) stage.dataset.phase = state.phase;
  if (!wasReady || stage.dataset.room !== place) {
    stage.dataset.room = place;
    if (scenery) {
      scenery.clearRect(0, 0, landscapeCanvas.width, landscapeCanvas.height);
      landscape(scenery, place);
    }
  }
  walkOptions.hidden = Boolean(state.trip || state.exploration);
  walkPlayer.hidden = !state.exploration;
  returnHome.hidden = !walkOptions.hidden;
  sleepButton.disabled = walkOptions.hidden;
  walk.update(state.exploration);
  if (changedWalk && currentTab === 'walk') panelContent.scrollTop = 0;
  syncWalkStage();
  renderState();
  for (const { id, meter, score } of meters) {
    meter.value = Math.round(state.needs[id]);
    setText(score, String(meter.value));
  }
  for (const { id, button } of wardrobe) {
    const disabled = !state.owned.includes(id);
    if (button.disabled !== disabled) button.disabled = disabled;
    const pressed = String(state.equipped[clothes[id].slot] === id);
    if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
  }
  room.value = state.room;
  clock.value = state.clock;
}
api.onPetState(update);

onLanguage(() => {
  renderState();
  walk.render();
  gameSession?.localize();
});

function publishHitArea() {
  if (mode !== 'overlay' || !state || !lastPose) return;
  const area = stage.classList.contains('side-scene') ? [] : sprite.hitArea(pet, lastPose);
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

const frames = createFrameLoop((dt, time) => {
  if (currentTab === 'walk' && !panel.hidden) walk.step(dt);
  if (arcadeRunning) gameSession?.step(dt);
  if (theaterRunning && !theater.step(dt)) finishActivity();
  if (pet.bounds) {
    pet.step(dt);
    lastPose = sprite.paint(pet);
    if (mode === 'overlay' && time - lastHitTime >= 30) {
      publishHitArea();
      lastHitTime = time;
    }
  }
});

function updateFps() {
  frames.setFps(pet.sleeping ? 10 : fps);
}

const languageInput = select('#language');
function applyPreferences(settings) {
  setLanguage(settings.language);
  languageInput.value = settings.language;
  languageInput.disabled = false;
  fps = settings.fps;
  volume = settings.volume / 100;
  pet.setSize(settings.size);
  sceneSize = settings.size;
  const brightness = settings.brightness === 100 ? 'none' : `brightness(${settings.brightness}%)`;
  document.body.style.setProperty('--scene-filter', brightness);
  for (const element of [select('.scenery'), select('#sprite'), activityCanvas]) element.style.filter = brightness;
  if (activeSound) activeSound.volume = 0.34 * volume;
  updateFps();
}
api.onPreferences(applyPreferences);
if (mode === 'welcome') {
  api.preferences().then(applyPreferences).catch(() => {});
  languageInput.addEventListener('change', async () => {
    const previous = document.documentElement.lang;
    languageInput.disabled = true;
    setMessage(settingsError, '');
    try {
      applyPreferences(await api.updatePreference('language', languageInput.value));
    } catch {
      languageInput.value = previous;
      setMessage(settingsError, 'Не удалось сохранить настройку.');
    } finally {
      languageInput.disabled = false;
    }
  });
}

let windowVisible = false;
function syncAnimation() {
  const visible = windowVisible && document.visibilityState === 'visible';
  if (!visible) {
    endPointer({});
    activeSound?.pause();
    lastHitArea = '';
    lastHitTime = -Infinity;
  }
  gameSession?.setPaused(!visible);
  frames.setRunning(visible);
}
api.onPetVisibility(visible => {
  windowVisible = visible;
  syncAnimation();
});
document.addEventListener('visibilitychange', syncAnimation);
