const path = require('node:path');
const { readJson, writeJson } = require('./storage.cjs');
const { needs, periods, rooms, clothes, trips, care } = require('../renderer/catalog.mjs');

const clamp = value => Math.min(100, Math.max(0, value));
const startingNeeds = { energy: 82, food: 70, water: 67, mood: 76, clean: 84, fun: 69 };
const rates = { energy: 2.5, food: 1.9, water: 3, mood: 0.9, clean: 1.2, fun: 3.6 };
const slots = ['hat', 'face', 'outfit', 'pin'];
const starterItems = Object.keys(clothes).filter(item => !clothes[item].from);

function phaseAt(time, selection) {
  if (selection !== 'auto') return selection;
  const hour = new Date(time).getHours();
  if (hour < 6 || hour >= 22) return 'night';
  if (hour < 11) return 'morning';
  if (hour < 18) return 'day';
  return 'evening';
}

function restore(saved, now) {
  const timestamp = value => Number.isFinite(value) && value > 0 ? value : 0;
  const owned = starterItems.concat(Object.keys(clothes).filter(item =>
    !starterItems.includes(item) && Array.isArray(saved.owned) && saved.owned.includes(item)
  ));
  const equipped = Object.fromEntries(slots.map(slot => {
    const item = saved.equipped?.[slot];
    return [slot, owned.includes(item) && clothes[item].slot === slot ? item : null];
  }));
  const trip = Object.hasOwn(trips, saved.trip?.id) && timestamp(saved.trip.endsAt)
    ? { id: saved.trip.id, endsAt: saved.trip.endsAt }
    : null;
  return {
    needs: Object.fromEntries(Object.keys(needs).map(id =>
      [id, Number.isFinite(saved.needs?.[id]) ? clamp(saved.needs[id]) : startingNeeds[id]]
    )),
    owned, equipped, trip,
    room: Object.hasOwn(rooms, saved.room) ? saved.room : 'meadow',
    clock: Object.hasOwn(periods, saved.clock) ? saved.clock : 'auto',
    sleeping: ['nap', 'night'].includes(saved.sleeping) ? saved.sleeping : null,
    sleptAt: timestamp(saved.sleptAt),
    awakeUntil: timestamp(saved.awakeUntil),
    updatedAt: Math.min(now, timestamp(saved.updatedAt) || now),
    tripLog: typeof saved.tripLog === 'string' ? saved.tripLog.slice(0, 280) : ''
  };
}

function createPetState(userData, { clock = Date.now, random = Math.random } = {}) {
  const file = path.join(userData, 'pet.json');
  const state = restore(readJson(file), clock());
  let nextDecision = clock() + 4000;
  let saveAt = 0;
  let status = '';

  function save() {
    try {
      writeJson(file, state);
      saveAt = clock();
    } catch (error) {
      console.warn('Could not save pet:', error.message);
      saveAt = clock();
    }
  }

  function snapshot(effect = null) {
    return { ...state, phase: phaseAt(clock(), state.clock), status, effect };
  }

  function gain(values) {
    for (const [id, value] of Object.entries(values)) state.needs[id] = clamp(state.needs[id] + value);
  }

  function advance(now) {
    // Limit time away from the app so a long absence still leaves a recoverable pet.
    const minutes = Math.max(0, Math.min(35, (now - state.updatedAt) / 60000));
    state.updatedAt = now;
    for (const [id, rate] of Object.entries(rates)) {
      const delta = state.sleeping ? (id === 'energy' ? 23 : -rate * 0.24) : -rate;
      state.needs[id] = clamp(state.needs[id] + delta * minutes);
    }
  }

  function sleep(kind, now) {
    state.sleeping = kind;
    state.sleptAt = now;
    status = 'Камешек тихонько спит.';
    return 'sleep';
  }

  function wake(now, manual = false) {
    state.sleeping = null;
    state.awakeUntil = now + (manual ? 120000 : 15000);
    status = 'Камешек проснулся.';
    return 'wake';
  }

  function useCare(id) {
    gain(care[id].gains);
    status = care[id].message;
    return id;
  }

  function finishTrip() {
    const destination = trips[state.trip.id];
    const event = destination.events[Math.floor(random() * destination.events.length)];
    let reward = '';
    if (!state.owned.includes(destination.item) && random() < 0.7) {
      state.owned.push(destination.item);
      reward = ' Находка в гардеробе — «' + clothes[destination.item].name + '».';
    }
    state.tripLog = event + reward;
    status = state.tripLog;
    state.trip = null;
    gain({ mood: 17, fun: 31, energy: -7, clean: -5 });
    return 'celebrate';
  }

  function tick({ busy, roaming, active }) {
    const now = clock();
    advance(now);
    const phase = phaseAt(now, state.clock);
    const { energy, water, food, mood, clean, fun } = state.needs;
    let effect = null;
    if (state.trip && now >= state.trip.endsAt) {
      effect = finishTrip();
      nextDecision = now + 7000;
    } else if (!busy && !state.trip && now >= nextDecision) {
      if (state.sleeping) {
        const rested = state.sleeping === 'nap' && energy >= 88 && now - state.sleptAt >= 25000;
        if (rested || (state.sleeping === 'night' && phase !== 'night')) effect = wake(now);
      } else if (now >= state.awakeUntil && (energy < 24 || phase === 'night')) {
        effect = sleep(phase === 'night' ? 'night' : 'nap', now);
      } else if (phase !== 'night') {
        if (water < 53) effect = useCare('water');
        else if (food < 44) {
          status = 'Камешек просит еды.';
          effect = 'hungry';
        } else if (clean < 32) effect = useCare('clean');
        else if (fun < 57 || mood < 49) effect = useCare('play');
        else if (roaming && active) {
          status = 'Камешек отправился размять бока.';
          effect = 'walk';
        }
      }
      nextDecision = now + (effect === 'hungry' ? 32000 : 7500 + random() * 5500);
    }
    if ((effect && !['walk', 'hungry'].includes(effect)) || now - saveAt >= 15000) save();
    return snapshot(effect);
  }

  function command(action, value) {
    const now = clock();
    advance(now);
    let effect = null;
    if (action === 'care' && Object.hasOwn(care, value)) {
      if (state.sleeping) wake(now, true);
      effect = useCare(value);
    } else if (action === 'stroke' && !state.sleeping) {
      gain({ mood: 3, fun: 1 });
      status = 'Камешку приятно.';
      effect = 'celebrate';
    } else if (action === 'sleep' && !state.trip) {
      effect = state.sleeping ? wake(now, true) : sleep('nap', now);
    } else if (action === 'equip' && state.owned.includes(value)) {
      const { slot } = clothes[value];
      state.equipped[slot] = state.equipped[slot] === value ? null : value;
    } else if (action === 'room' && Object.hasOwn(rooms, value)) {
      state.room = value;
    } else if (action === 'clock' && (value === 'auto' || Object.hasOwn(periods, value))) {
      state.clock = value;
      if (phaseAt(now, value) === 'night') state.awakeUntil = 0;
      nextDecision = now;
      const updated = tick({ busy: false, roaming: false, active: false });
      save();
      return updated;
    } else if (action === 'trip' && !state.trip && Object.hasOwn(trips, value)) {
      if (state.sleeping) wake(now, true);
      state.trip = { id: value, endsAt: now + trips[value].duration * 1000 };
      state.tripLog = '';
      status = 'Камешек на прогулке.';
      effect = 'walk';
    } else if (action === 'return' && state.trip) {
      state.trip = null;
      status = 'Камешек вернулся домой.';
    } else if (action === 'activity' || action === 'alert') {
      if (state.sleeping) effect = wake(now, true);
    } else if (action === 'game' && Number.isInteger(value) && value >= 1 && value <= 24) {
      gain({ mood: value, fun: value + 7, energy: -4 });
      status = 'Настроение поднялось на ' + value + '.';
      effect = 'celebrate';
    } else {
      return snapshot();
    }
    nextDecision = now + 9000;
    save();
    return snapshot(effect);
  }

  return { tick, command, snapshot, save };
}

module.exports = { createPetState };
