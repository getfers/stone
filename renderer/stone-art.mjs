import { ellipse, garment } from './art.mjs';

export function drawEyes(ctx, x, y, { held, joy, blink, sleep = 0, sip }) {
  ctx.strokeStyle = '#161616';
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  for (const eyeX of [x - 21, x + 21]) {
    if (joy > 0.08 || blink || sleep > 0.88 || sip) {
      ctx.beginPath();
      ctx.moveTo(eyeX - 7, y + 3);
      ctx.quadraticCurveTo(eyeX, y + (joy > 0.08 ? -9 : sleep > 0.8 ? 10 : 2), eyeX + 7, y + 3);
      ctx.stroke();
    } else {
      const rx = held ? 10.5 : 11.5;
      const ry = (held ? 16 : 14.5) * (1 - sleep * 0.89);
      ellipse(ctx, eyeX, y, rx, ry, '#141414');
      ellipse(ctx, eyeX - 3.6, y - ry * 0.35, 3.2, ry * 0.23, '#fcfcfc');
      ellipse(ctx, eyeX + 4, y + ry * 0.39, 1.3, ry * 0.11, '#a8a8a8');
    }
  }
}

export function drawClothes(ctx, { hat, face, outfit, pin }, lookX, lookY) {
  if (hat) garment(ctx, hat, -6, -51);
  if (face) garment(ctx, face, lookX, lookY);
  if (outfit) garment(ctx, outfit === 'cape' ? 'capeCollar' : outfit, outfit === 'bow' ? 24 : 0, 31);
  if (pin) garment(ctx, pin, -32, 25, 0.7);
}
