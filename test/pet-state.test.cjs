const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { createPetState } = require('../electron/pet-state.cjs');

function setup(t, saved = {}, hour = 13) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stone-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'pet.json'), JSON.stringify(saved));
  let now = new Date(2026, 10, 23, hour).getTime();
  const open = () => createPetState(dir, { clock: () => now, random: () => 0 });
  return {
    open,
    pet: open(),
    advance: seconds => { now += seconds * 1000; },
    tick: pet => pet.tick({ busy: false, roaming: true, active: true })
  };
}

test('autonomous behavior chooses water, food requests, play and movement from needs', t => {
  const thirsty = setup(t, { needs: { water: 32, energy: 50, food: 25 } });
  thirsty.advance(5);
  const drink = thirsty.tick(thirsty.pet);
  assert.equal(drink.effect, 'water');
  assert.ok(drink.needs.water > 70 && drink.needs.energy > 55);
  thirsty.advance(9);
  assert.equal(thirsty.tick(thirsty.pet).effect, 'hungry');

  const bored = setup(t, { needs: { fun: 26 } });
  bored.advance(5);
  assert.equal(bored.tick(bored.pet).effect, 'play');

  const roaming = setup(t);
  roaming.advance(5);
  const tick = roaming.pet.tick({ busy: true, roaming: true, active: true });
  assert.equal(tick.effect, null);
  assert.equal(roaming.tick(roaming.pet).effect, 'walk');
});

test('sleep quiets activity, restores energy and respects night and manual wake', t => {
  const { advance, open, pet, tick } = setup(t, { needs: { energy: 20 } }, 23);
  advance(5);
  const night = tick(pet);
  assert.equal(night.effect, 'sleep');
  assert.equal(open().snapshot().sleeping, 'night');

  advance(60);
  const sleeping = tick(pet);
  assert.equal(sleeping.effect, null);
  assert.ok(sleeping.needs.energy > 40);
  assert.equal(pet.command('sleep').effect, 'wake');
  advance(15);
  assert.equal(tick(pet).sleeping, null);
  assert.equal(pet.command('clock', 'night').sleeping, 'night');
  assert.equal(pet.command('clock', 'morning').effect, 'wake');
  assert.equal(open().snapshot().clock, 'morning');

  const tired = setup(t, { needs: { energy: 20 } });
  tired.advance(5);
  assert.equal(tired.tick(tired.pet).sleeping, 'nap');
  tired.advance(200);
  assert.equal(tired.tick(tired.pet).effect, 'wake');
});

test('trips complete after restart, reward once and keep equipped items and room', t => {
  const { advance, pet, open, tick } = setup(t);
  pet.command('room', 'garden');
  pet.command('equip', 'glasses');
  pet.command('trip', 'forest');
  assert.equal(pet.command('trip', 'beach').trip.id, 'forest');
  const reopened = open();
  assert.equal(reopened.snapshot().trip.id, 'forest');
  advance(19);
  const complete = tick(reopened);
  assert.equal(complete.trip, null);
  assert.equal(complete.effect, 'celebrate');
  assert.match(complete.tripLog, /Лесной берет/);
  assert.equal(tick(reopened).effect, null);
  reopened.command('equip', 'leaf');
  const persisted = open().snapshot();
  assert.equal(persisted.room, 'garden');
  assert.deepEqual(persisted.equipped, { hat: 'leaf', face: 'glasses', outfit: null, pin: null });
  assert.equal(persisted.owned.filter(id => id === 'leaf').length, 1);

  reopened.command('trip', 'picnic');
  reopened.command('return');
  advance(30);
  assert.ok(!tick(reopened).owned.includes('bow'));
});

test('restoring invalid data preserves defaults and rejects unowned equipment', t => {
  const { pet } = setup(t, {
    needs: { energy: 170, fun: -9, water: 'full' },
    owned: ['unknown'],
    equipped: { hat: 'leaf', face: 'scarf' },
    room: 'unknown',
    clock: 'unknown',
    trip: { id: 'unknown', endsAt: 123 }
  });
  const state = pet.snapshot();
  assert.equal(state.needs.energy, 100);
  assert.equal(state.needs.fun, 0);
  assert.equal(state.needs.water, 67);
  assert.equal(state.equipped.hat, null);
  assert.equal(state.equipped.face, null);
  assert.equal(state.room, 'meadow');
  assert.equal(state.phase, 'day');
  assert.equal(state.trip, null);
});


test('exploration resumes across restarts and rewards each stop once', t => {
  const { open, pet } = setup(t, { needs: { energy: 40, mood: 40 } });
  pet.command('sleep');
  const { exploration, sleeping } = pet.command('explore', 'forest');
  assert.equal(sleeping, null);
  assert.equal(exploration.id, 'forest');
  const { token } = exploration;
  assert.equal(pet.command('discover', { token: 'stale', stop: 'pine' }).exploration.visited.length, 0);
  assert.equal(pet.command('discover', { token, stop: 'bench' }).exploration.visited.length, 0);
  const found = pet.command('discover', { token, stop: 'pine' });
  assert.deepEqual(found.exploration.discovery, { kind: 'wardrobe', id: 'leaf' });
  assert.ok(found.owned.includes('leaf'));
  assert.ok(found.needs.energy > 40 && found.needs.mood > 40);

  const resumed = open();
  assert.deepEqual(resumed.snapshot().exploration.visited, ['pine']);
  const duplicate = resumed.command('discover', { token, stop: 'pine' });
  assert.deepEqual(duplicate.needs, found.needs);
  assert.equal(duplicate.owned.filter(id => id === 'leaf').length, 1);
  resumed.command('discover', { token, stop: 'moss' });
  const complete = resumed.command('discover', { token, stop: 'lights' });
  assert.equal(complete.exploration.visited.length, 3);
  assert.equal(complete.exploration.discovery.kind, 'item');
  assert.ok(complete.needs.energy >= 55 && complete.needs.mood >= 58);
  assert.equal(resumed.command('return').exploration, null);
  const newWalk = resumed.command('explore', 'mountain');
  assert.equal(resumed.command('discover', { token, stop: 'cairn' }).exploration.token, newWalk.exploration.token);
  assert.equal(resumed.snapshot().exploration.visited.length, 0);
});
