import { ball, bottle, ellipse, garment, landscape, roll } from './art.mjs';

const width = 256;
const height = 210;
const originX = width / 2;
const originY = 111;

const contour = new Path2D(
  'M -70 9 C -73 -8 -62 -26 -50 -39 C -32 -58 -7 -62 15 -55 C 35 -51 60 -38 69 -15 C 77 6 72 24 55 34 C 33 47 -30 44 -52 34 C -64 28 -69 19 -70 9 Z'
);

function face(ctx, { held, joy, blink, look, sleep, sip, puff }) {
  ctx.strokeStyle = '#161616';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  for (const x of [-22 + look, 20 + look]) {
    if (joy > 0.08 || blink || sleep > 0.88 || sip) {
      ctx.beginPath();
      ctx.moveTo(x - 7, 0);
      ctx.quadraticCurveTo(x, joy ? -13 : sleep > 0.8 ? 7 : -1, x + 7, 0);
      ctx.stroke();
    } else {
      const eye = ctx.createRadialGradient(x - 4, -9, 1, x, -3, 15);
      eye.addColorStop(0, '#343434');
      eye.addColorStop(0.62, '#101010');
      eye.addColorStop(1, '#000000');
      const rx = held ? 11 : 13;
      const ry = (held ? 17 : 15) * (1 - sleep * 0.93);
      ellipse(ctx, x, -3, rx, ry, eye);
      ellipse(ctx, x - 3.7, -3 - ry * 0.36, 3.4, ry * 0.25, '#f7f7f7');
      ellipse(ctx, x + 4.3, -3 + ry * 0.42, 1.35, ry * 0.11, '#8d8d8d');
    }
  }

  if (held || sip || puff || sleep > 0.88) {
    ellipse(ctx, look, 14, puff ? 6 : 3.7, sleep > 0.88 ? 3 : 4.8, '#171717');
  } else if (joy) {
    ctx.beginPath();
    ctx.moveTo(look - 6, 12);
    ctx.quadraticCurveTo(look, 24, look + 6, 12);
    ctx.stroke();
  }
}

function hearts(ctx, joy) {
  if (!joy) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, joy * 3);
  for (const [x, y, size] of [[-60, -50, 0.68], [62, -62, 0.88], [80, -39, 0.51]]) {
    ctx.save();
    ctx.translate(x, y - (1 - joy) * 24);
    ctx.scale(size, size);
    ctx.fillStyle = '#ebcfa6';
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-20, -9, -6, -18, 0, -9);
    ctx.bezierCurveTo(6, -18, 20, -9, 0, 5);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function poseFor(pet, reduced) {
  const factor = reduced ? 0.2 : 1;
  const joy = Math.max(0, pet.happyUntil - pet.time) / 1.05;
  const hop = joy ? Math.sin((1 - joy) * Math.PI) * -13 * factor : 0;
  const crawl = Math.sin(pet.stride) * pet.motion * factor;
  const sleep = pet.sleepBlend;
  const age = pet.time - pet.effectAt;
  const effect = age < 3.2 && !pet.sleeping ? pet.effect : null;
  const puff = effect === 'steam' && age > 0.35 && age < 1.45;
  const sip = effect === 'water' && age > 0.59 && age < 1.95;
  const breathe = Math.sin(pet.time * (2.5 - sleep * 1.25)) * 0.023 * factor;
  const swell = puff ? Math.sin((age - 0.35) / 1.1 * Math.PI) * 0.09 * factor : 0;
  return {
    joy: joy * (1 - sleep), held: pet.held, look: pet.look * 8,
    sleep, sip, puff, age, effect, time: pet.time, equipped: pet.equipped,
    phase: pet.phase, previousPhase: pet.previousPhase, phaseBlend: pet.phaseBlend,
    trip: pet.trip, desktop: pet.mode === 'overlay', reduced,
    blink: pet.time >= pet.nextBlink && pet.time < pet.nextBlink + 0.14,
    sx: 1 + breathe + crawl * 0.068 - (pet.held ? 0.085 : 0) + sleep * 0.07 + swell,
    sy: 1 - breathe - crawl * 0.06 + (pet.held ? 0.09 : 0) - sleep * 0.13 + swell,
    dy: hop * (1 - sleep) - Math.abs(crawl * 5) - (pet.held ? 8 : 0) + sleep * 6,
    skew: pet.tilt + pet.look * pet.motion * 0.11 * factor
  };
}

function paintBody(ctx) {
  const body = ctx.createRadialGradient(-24, -43, 7, 3, -20, 95);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.53, '#f5f5f3');
  body.addColorStop(0.83, '#e3e3df');
  body.addColorStop(1, '#bdbdb7');
  ctx.fillStyle = body;
  ctx.fill(contour);
  ctx.strokeStyle = '#aaaaa4';
  ctx.lineWidth = 1;
  ctx.stroke(contour);
}

function effects(ctx, pose) {
  const { effect, age, sleep, reduced, time } = pose;
  if (effect === 'water') {
    const lift = Math.max(0, Math.min(1, age / 0.65, (2.8 - age) / 0.7));
    if (lift) {
      const slide = 1 - Math.sin(lift * Math.PI / 2);
      const liquid = 0.83 - 0.57 * Math.max(0, Math.min(1, (age - 0.6) / 1.35));
      bottle(ctx, 35 + 64 * slide, 19 + 42 * slide, -0.12 - lift * 1.03, 1.05, liquid, lift > 0.8);
      if (pose.sip) ellipse(ctx, 10 + Math.cos(age * 25) * 4, 15, 3, 2, '#a2e6f9');
    }
  } else if (effect === 'steam') {
    for (let index = 0; index < 5; index++) {
      const t = (age - 0.63 - index * 0.115) / 1.06;
      if (t <= 0 || t >= 1) continue;
      const x = 3 + (index - 2) * (4 + 4 * t);
      const y = -60 - t * (reduced ? 15 : 37);
      const radius = 6 + t * 7;
      const cloud = ctx.createRadialGradient(x - 2, y - 4, 0, x, y, radius);
      cloud.addColorStop(0, '#ffffff');
      cloud.addColorStop(0.62, '#f4f6fc');
      cloud.addColorStop(1, '#f4f6fc00');
      ctx.globalAlpha = Math.sin(Math.PI * t) * 0.88;
      ellipse(ctx, x, y, radius, radius, cloud);
    }
    ctx.globalAlpha = 1;
  } else if (effect === 'food' && age < 1.45) {
    const lift = Math.min(1, age / 1.45);
    roll(ctx, -82 + 74 * lift, 22 - 7 * lift, 1.1 - lift * 0.35, 0.1);
  } else if (effect === 'play') {
    ball(ctx, 73 + Math.sin(age * 4) * 18, 28 - Math.abs(Math.sin(age * 7)) * (reduced ? 4 : 42), 14);
  } else if (effect === 'clean') {
    for (let i = 0; i < 6; i++) {
      const progress = (age * 0.7 + i * 0.16) % 1;
      const x = -66 + i * 26;
      const y = 26 - progress * 87;
      ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.75;
      ellipse(ctx, x, y, 6, 6, '#b7e7fb');
      ellipse(ctx, x - 2, y - 2, 1.7, 1.7, '#ffffff');
    }
    ctx.globalAlpha = 1;
  } else if (effect === 'hungry') {
    ellipse(ctx, 54, -73, 22, 17, '#f6f0e6');
    ellipse(ctx, 39, -58, 3, 3, '#f6f0e6');
    roll(ctx, 54, -73, 0.86);
  }
  if (sleep > 0.45) {
    for (let index = 0; index < 3; index++) {
      const t = reduced ? 0.36 + index * 0.17 : (time * 0.24 + index / 3) % 1;
      ctx.globalAlpha = Math.sin(Math.PI * t) * sleep;
      ctx.font = 'bold ' + (13 + Math.round(t * 7)) + 'px system-ui';
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = '#393939';
      ctx.fillStyle = '#f7f5ef';
      ctx.strokeText('z', 48 + t * 28, -36 - t * 34);
      ctx.fillText('z', 48 + t * 28, -36 - t * 34);
    }
    ctx.globalAlpha = 1;
  }
}

function desktopScene(ctx, pose, phase, opacity) {
  if (opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  if (pose.trip) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-105, -57, 210, 114, 54);
    ctx.clip();
    const colors = { morning: '#36332e', day: '#303632', evening: '#3b322b', night: '#282b2c' };
    ctx.fillStyle = colors[phase];
    ctx.fillRect(-105, -57, 210, 114);
    ctx.translate(-105, -57);
    ctx.scale(210 / 440, 114 / 240);
    landscape(ctx, pose.trip);
    ctx.restore();
  }
  const night = phase === 'night';
  const x = pose.trip ? -73 : -59;
  const y = pose.trip ? -38 : -53;
  ellipse(ctx, x, y, 8, 8, night ? '#e1dfd6' : '#ffe2a2');
  if (night) ellipse(ctx, x + 2, y - 1, 5.5, 5.5, '#a3a199');
  ctx.restore();
}

function draw(ctx, pose, body) {
  ctx.save();
  ctx.translate(originX, originY);
  if (pose.desktop) {
    if (!pose.reduced && pose.phaseBlend < 1) {
      desktopScene(ctx, pose, pose.previousPhase, 1);
      desktopScene(ctx, pose, pose.phase, pose.phaseBlend);
    } else {
      desktopScene(ctx, pose, pose.phase, 1);
    }
  }
  const shadow = ctx.createRadialGradient(0, 0, 2, 0, 0, 78);
  shadow.addColorStop(0, pose.held ? '#11111154' : '#0c0c0c96');
  shadow.addColorStop(1, '#11111100');
  ctx.save();
  ctx.translate(1, 44);
  ctx.scale(1.08, 0.18);
  ellipse(ctx, 0, 0, 78, 78, shadow);
  ctx.restore();

  hearts(ctx, pose.joy);
  ctx.translate(0, pose.dy);
  ctx.transform(pose.sx, 0, pose.skew, pose.sy, 0, 0);
  ctx.drawImage(body, -76, -63, 152, 111);
  face(ctx, pose);
  const { hat, face: eyewear, outfit, pin } = pose.equipped;
  if (hat) garment(ctx, hat, -6, -51);
  if (eyewear) garment(ctx, eyewear, pose.look, -3);
  if (outfit) garment(ctx, outfit, outfit === 'bow' ? 24 : 0, 31);
  if (pin) garment(ctx, pin, -32, 25, 0.7);
  ctx.restore();
  ctx.save();
  ctx.translate(originX, originY);
  effects(ctx, pose);
  ctx.restore();
}

// Rows follow the silhouette so its transparent corners and shadow remain click-through.
const hitRows = [
  [-57, -46, -28, 29], [-46, -32, -47, 47], [-32, -16, -59, 60],
  [-16, 7, -68, 70], [7, 20, -67, 69], [20, 32, -60, 60],
  [32, 40, -45, 44], [40, 43, -29, 30]
];

export function createSprite(button, canvas) {
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const body = document.createElement('canvas');
  const bodyContext = body.getContext('2d');
  let ratio;

  return {
    paint(pet) {
      const scale = pet.scale;
      const dpr = window.devicePixelRatio;
      if (ratio !== dpr * scale) {
        ratio = dpr * scale;
        canvas.width = Math.ceil(width * ratio);
        canvas.height = Math.ceil(height * ratio);
        button.style.width = width * scale + 'px';
        button.style.height = height * scale + 'px';
        body.width = Math.ceil(152 * ratio);
        body.height = Math.ceil(111 * ratio);
        bodyContext.setTransform(body.width / 152, 0, 0, body.height / 111, 0, 0);
        bodyContext.translate(76, 63);
        paintBody(bodyContext);
      }
      button.style.transform = `translate(${pet.x - originX * scale}px, ${pet.y - originY * scale}px)`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width + 1, height + 1);
      const pose = poseFor(pet, reduced.matches);
      draw(ctx, pose, body);
      return pose;
    },
    hitArea(pet, pose) {
      const rows = [...hitRows];
      if (pose.equipped.hat) rows.push([-81, -72, -23, 11], [-72, -60, -33, 18], [-60, -43, -39, 27]);
      if (pose.equipped.outfit === 'scarf') rows.push([41, 50, 23, 37]);
      return rows.map(([top, bottom, left, right]) => {
        const shift = (top + bottom) * 0.5 * pose.skew;
        return {
          x: Math.round(pet.x + (left * pose.sx + shift) * pet.scale),
          y: Math.round(pet.y + (top * pose.sy + pose.dy) * pet.scale),
          width: Math.max(1, Math.round((right - left) * pose.sx * pet.scale)),
          height: Math.max(1, Math.ceil((bottom - top) * pose.sy * pet.scale + 0.5))
        };
      });
    }
  };
}
