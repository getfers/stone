import { createSprite } from './animation.mjs';

// The exploration and game boards use the same character and wardrobe renderer as home.
const sizeScale = { small: 0.8, medium: 1, large: 1.2 };

export function createScenePet(host, equipped, size) {
  const holder = document.createElement('div');
  const canvas = document.createElement('canvas');
  holder.className = 'scene-pet';
  holder.setAttribute('aria-hidden', 'true');
  holder.append(canvas);
  host.append(holder);
  const sprite = createSprite(holder, canvas);
  const pose = {
    x: 0, y: 0, scale: 0.5, time: 0, look: 0, motion: 0, stride: 0, tilt: 0, sleepBlend: 0,
    happyUntil: 0, effectAt: -Infinity, nextBlink: 3, equipped: {}
  };

  return {
    paint(dt, x, y, scale, moving = false, direction = 0) {
      pose.x = x;
      pose.y = y;
      pose.scale = scale * sizeScale[size()];
      pose.time += dt;
      pose.motion = moving ? 1 : 0;
      pose.look += (Math.sign(direction) - pose.look) * Math.min(1, dt * 9);
      pose.stride += moving ? dt * 14 : 0;
      if (pose.time > pose.nextBlink + 0.14) pose.nextBlink = pose.time + 3 + Math.random() * 3;
      pose.equipped = equipped();
      sprite.paint(pose);
    },
    celebrate() { pose.happyUntil = pose.time + 1.05; }
  };
}
