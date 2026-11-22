const width = 256;
const height = 210;
const originX = width / 2;
const originY = 111;
const tau = Math.PI * 2;

const contour = new Path2D(
  'M -70 9 C -73 -8 -62 -26 -50 -39 C -32 -58 -7 -62 15 -55 C 35 -51 60 -38 69 -15 C 77 6 72 24 55 34 C 33 47 -30 44 -52 34 C -64 28 -69 19 -70 9 Z'
);

const speckles = Array.from({ length: 260 }, (_, index) => {
  const grain = Number((Math.sin(index * 78.233 + 1) * 43758.5453).toFixed(6));
  const fraction = grain - Math.floor(grain);
  return [(index * 79 % 147) - 73, fraction * 107 - 61, 0.2 + (index % 7) * 0.22];
});

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, tau);
  ctx.fill();
}

function face(ctx, { held, joy, blink, look }) {
  ellipse(ctx, -44 + look, 11, 9, 4, '#f9acb97a');
  ellipse(ctx, 44 + look, 11, 9, 4, '#f9acb97a');
  ctx.strokeStyle = '#372641';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  for (const x of [-22 + look, 20 + look]) {
    if (joy > 0.08 || blink) {
      ctx.beginPath();
      ctx.moveTo(x - 7, 0);
      ctx.quadraticCurveTo(x, joy ? -13 : -1, x + 7, 0);
      ctx.stroke();
    } else {
      const eye = ctx.createLinearGradient(x, -14, x, 8);
      eye.addColorStop(0, '#21192d');
      eye.addColorStop(1, '#4c3c5e');
      const rx = held ? 7.5 : 9.5;
      const ry = held ? 13.2 : 11.8;
      ellipse(ctx, x, -3, rx, ry, eye);
      ellipse(ctx, x - 2.2, -7.2, 3, 3.2, '#fff5ff');
      ellipse(ctx, x + 3.4, 2, 1.35, 1.3, '#d9c3e9');
    }
  }

  if (held) {
    ellipse(ctx, look, 14, 3.7, 4.8, '#3b2745');
  } else {
    ctx.beginPath();
    ctx.moveTo(look - 6, 12);
    ctx.quadraticCurveTo(look, joy ? 24 : 18, look + 6, 12);
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
    ctx.fillStyle = '#f8b2dc';
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
  const breathe = Math.sin(pet.time * 2.5) * 0.023 * factor;
  return {
    joy, held: pet.held, look: pet.look * 8,
    blink: pet.time >= pet.nextBlink && pet.time < pet.nextBlink + 0.14,
    sx: 1 + breathe + crawl * 0.068 - (pet.held ? 0.085 : 0),
    sy: 1 - breathe - crawl * 0.06 + (pet.held ? 0.09 : 0),
    dy: hop - Math.abs(crawl * 5) - (pet.held ? 8 : 0),
    skew: pet.tilt + pet.look * pet.motion * 0.11 * factor
  };
}

function paintBody(ctx) {
  const body = ctx.createRadialGradient(-30, -47, 4, 4, -10, 90);
  body.addColorStop(0, '#fff1ee');
  body.addColorStop(0.41, '#d9bde1');
  body.addColorStop(0.74, '#a489b8');
  body.addColorStop(1, '#624970');
  ctx.fillStyle = body;
  ctx.fill(contour);
  ctx.strokeStyle = '#553e67';
  ctx.lineWidth = 2;
  ctx.stroke(contour);

  ctx.save();
  ctx.clip(contour);
  for (const [x, y, radius] of speckles) {
    ellipse(ctx, x, y, radius, radius * 0.71, radius > 1.05 ? '#634a7d30' : '#fff7fc69');
  }
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(-47, -36);
  ctx.bezierCurveTo(-32, -51, -12, -54, 3, -53);
  ctx.strokeStyle = '#fff2f3a3';
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function draw(ctx, pose, body) {
  ctx.save();
  ctx.translate(originX, originY);
  const shadow = ctx.createRadialGradient(0, 0, 2, 0, 0, 78);
  shadow.addColorStop(0, pose.held ? '#19102854' : '#120a207f');
  shadow.addColorStop(1, '#10091a00');
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
      return hitRows.map(([top, bottom, left, right]) => {
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
