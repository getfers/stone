import { clothes } from './catalog.mjs';
import { setMessage, t } from './localization.mjs';
import { createScenePet } from './scene-pet.mjs';
import { paintWalk } from './walk-art.mjs';
import { finds, walks } from './walk-catalog.mjs';

const entry = { x: 14, y: 86 };
const beside = stop => ({ x: stop.x > 70 ? stop.x - 8 : stop.x + 8, y: stop.y + 8 });

export function createWalk(scene, player, api, equipped, size) {
  const scenery = scene.querySelector('canvas');
  const markers = scene.querySelector('.walk-markers');
  const name = scene.querySelector('.walk-name');
  const progress = player.querySelector('#walk-progress');
  const output = player.querySelector('#trip-status');
  const sprite = createScenePet(scene, equipped, size);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let walk;
  let position = { ...entry };
  let journey;
  let markersById = new Map();

  function move(stop) {
    if (journey?.stop === stop) return;
    const goal = beside(stop);
    journey = {
      stop, from: { ...position }, goal, elapsed: 0, arrived: false,
      duration: reduced.matches ? 0.12 : 0.35 + Math.hypot(goal.x - position.x, goal.y - position.y) / 43
    };
    render();
  }

  function drawScenery() {
    const { clientWidth: width, clientHeight: height } = scene;
    if (!walk || !width || !height) return;
    const ratio = Math.min(window.devicePixelRatio, 2);
    scenery.width = Math.round(width * ratio);
    scenery.height = Math.round(height * ratio);
    paintWalk(scenery, walk.id, walks[walk.id].stops);
  }
  new ResizeObserver(drawScenery).observe(scene);

  function rebuild() {
    const destination = walks[walk.id];
    setMessage(name, destination.name);
    drawScenery();
    markersById = new Map();
    const buttons = destination.stops.map(stop => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'walk-marker';
      button.dataset.stop = stop.id;
      button.style.left = stop.x + '%';
      button.style.top = stop.y + '%';
      const symbol = document.createElement('span');
      symbol.className = 'walk-marker-symbol';
      symbol.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'walk-marker-label';
      setMessage(label, stop.name);
      button.append(symbol, label);
      button.addEventListener('click', () => move(stop));
      markersById.set(stop.id, { button, symbol });
      return button;
    });
    markers.replaceChildren(...buttons);
    const last = destination.stops.find(stop => stop.id === walk.lastStop);
    position = last ? beside(last) : { ...entry };
  }

  function render() {
    if (!walk) return;
    const destination = walks[walk.id];
    for (const stop of destination.stops) {
      const { button, symbol } = markersById.get(stop.id);
      const visited = walk.visited.includes(stop.id);
      button.dataset.visited = String(visited);
      button.dataset.target = String(journey?.stop === stop);
      button.setAttribute('aria-label', visited ? t(stop.name) + ' · ' + t('Исследовано') : t(stop.name));
      symbol.textContent = visited ? '✓' : '·';
    }
    const finished = walk.visited.length === destination.stops.length;
    progress.textContent = t('Исследовано: {visited} из {total}', {
      visited: walk.visited.length, total: destination.stops.length
    });
    let text;
    if (journey) text = t('Камешек идёт исследовать это место…');
    else if (finished) text = t('Все уголки исследованы. Камешек отдохнул и набрался сил.');
    else if (walk.lastStop) text = t('Камешек осмотрелся и немного отдохнул.');
    else text = t('Выберите точку на карте, и камешек отправится её исследовать.');

    const item = walk.discovery;
    if (!journey && item) {
      const label = item.kind === 'wardrobe' ? clothes[item.id].name : finds[item.id].name;
      text = t(item.kind === 'wardrobe' ? 'Находка в гардеробе — «{item}».' : 'Находка: {item}.', { item: t(label) }) +
        (finished ? ' ' + text : '');
    }
    if (output.textContent !== text) output.textContent = text;
  }

  function update(next) {
    const previous = walk;
    walk = next;
    if (!next) {
      journey = undefined;
      return;
    }
    if (previous?.token !== next.token) {
      journey = undefined;
      rebuild();
    } else if (previous.visited.length !== next.visited.length) {
      if (journey?.arrived && journey.stop.id === next.lastStop) journey = undefined;
      sprite.celebrate();
    }
    render();
  }

  return {
    update, render,
    step(dt) {
      const { clientWidth: width, clientHeight: height } = scene;
      if (!walk || !width || !height) return;
      const moving = journey && !journey.arrived;
      const direction = moving ? journey.goal.x - position.x : 0;
      if (moving) {
        journey.elapsed += dt;
        const progress = Math.min(1, journey.elapsed / journey.duration);
        const eased = progress * progress * (3 - 2 * progress);
        position.x = journey.from.x + (journey.goal.x - journey.from.x) * eased;
        position.y = journey.from.y + (journey.goal.y - journey.from.y) * eased;
        if (progress === 1) {
          if (walk.visited.includes(journey.stop.id)) {
            journey = undefined;
            sprite.celebrate();
            render();
          } else {
            journey.arrived = true;
            api.petCommand('discover', { token: walk.token, stop: journey.stop.id });
          }
        }
      }
      sprite.paint(dt, width * position.x / 100, height * position.y / 100,
        Math.min(width / 690, height / 490, 0.82), moving, direction);
    }
  };
}
