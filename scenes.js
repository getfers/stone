let vape = { active: false, timer: 0, duration: 210, nextAutoTime: Date.now() + 10000 + Math.random() * 8000, blueLevel: 0 };
let vaporParticles = [];

let life = { state: 'alive', timer: 0, scale: 1, ghostY: 0, ghostAlpha: 0 };
let bulbScene = { active: false, timer: 0, ladderVisible: false, bulbState: 'none', shards: [], flashAlpha: 0 };
let blocksScene = { active: false, timer: 0, phase: 'falling', currentIdx: 0, blocks: [], shapeType: 0 };
let slideScene = { active: false, phase: 'approach', timer: 0, progress: 0, speed: 0 };

function isAnySceneActive() {
  return vape.active || bulbScene.active || blocksScene.active || slideScene.active || life.state !== 'alive';
}

function startVape() {
  if (isAnySceneActive()) return;
  walker.isWalking = false;
  vape.active = true;
  vape.timer = 0;
  vape.nextAutoTime = Date.now() + 14000 + Math.random() * 10000;
}

function triggerDeath() {
  vape.active = false;
  walker.isWalking = false;
  bulbScene.active = false;
  blocksScene.active = false;
  slideScene.active = false;
  isDragging = false;
  life.state = 'dying';
  life.timer = 0;
  life.ghostY = center.y;
  life.ghostAlpha = 0.7;
}

function triggerRebirth() {
  life.state = 'reborn';
  life.timer = 0;
  life.scale = 0.35;
  vape.blueLevel = 0;
  center.x = 240;
  center.y = 70;
  initNodes(0.35);
  currentEmotion = 3;
  nextEmotionTime = Date.now() + 4000;
}

function startBulbScene() {
  if (isAnySceneActive()) return;
  walker.isWalking = false;
  bulbScene.active = true;
  bulbScene.timer = 0;
  bulbScene.ladderVisible = true;
  bulbScene.bulbState = 'screwing';
  bulbScene.shards = [];
  bulbScene.flashAlpha = 0;
  currentEmotion = 0;
}

function startBlocksScene() {
  if (isAnySceneActive()) return;
  walker.isWalking = false;
  blocksScene.active = true;
  blocksScene.timer = 0;
  blocksScene.phase = 'falling';
  blocksScene.currentIdx = 0;
  blocksScene.shapeType = Math.floor(Math.random() * 3);
  currentEmotion = 3;

  const size = 24;
  const floorY = canvas.height - MARGIN - size / 2;
  const colors = ['#ef4444', '#3b82f6', '#eab308', '#10b981'];

  let targets = [];
  if (blocksScene.shapeType === 0) {
    targets = [{ x: 240, y: floorY }, { x: 240, y: floorY - size }, { x: 240, y: floorY - size * 2 }, { x: 240, y: floorY - size * 3 }];
  } else if (blocksScene.shapeType === 1) {
    targets = [{ x: 240 - size, y: floorY }, { x: 240, y: floorY }, { x: 240 + size, y: floorY }, { x: 240, y: floorY - size }];
  } else {
    targets = [{ x: 240 - size, y: floorY }, { x: 240 + size, y: floorY }, { x: 240 - size * 0.5, y: floorY - size }, { x: 240 + size * 0.5, y: floorY - size }];
  }

  blocksScene.blocks = [];
  for (let i = 0; i < 4; i++) {
    let rx = i % 2 === 0 ? (45 + Math.random() * 115) : (320 + Math.random() * 115);
    blocksScene.blocks.push({ x: rx, y: -20 - i * 35, vy: 0, size: size, color: colors[i], tx: targets[i].x, ty: targets[i].y, placed: false, carried: false });
  }
}

function startSlideScene() {
  if (isAnySceneActive()) return;
  walker.isWalking = false;
  slideScene.active = true;
  slideScene.phase = 'approach';
  slideScene.timer = 0;
  slideScene.progress = 0;
  slideScene.speed = 0;
  currentEmotion = 0;
}

// --- ЛОГИКА И ОТРИСОВКА ГОРКИ ---
function updateSlideScene() {
  slideScene.timer++;
  const s = life.scale;
  const floorCenterY = canvas.height - MARGIN - 54 * s;

  if (slideScene.phase === 'approach') {
    moveCharacterTo(105, floorCenterY, 0.11);
    if (Math.abs(center.x - 105) < 10 && slideScene.timer > 25) {
      slideScene.phase = 'climbing';
      slideScene.timer = 0;
    }
  } else if (slideScene.phase === 'climbing') {
    const topY = 92 - 46 * s;
    moveCharacterTo(155, topY, 0.085);
    if (Math.abs(center.y - topY) < 6 && slideScene.timer > 45) {
      slideScene.phase = 'sliding';
      slideScene.progress = 0;
      slideScene.speed = 0.008;
      currentEmotion = 3;
    }
  } else if (slideScene.phase === 'sliding') {
    slideScene.speed = Math.min(0.036, slideScene.speed + 0.0009);
    slideScene.progress += slideScene.speed;
    const t = Math.min(1, slideScene.progress);

    const p0 = { x: 165, y: 92 - 46 * s };
    const p1 = { x: 235, y: 225 - 46 * s };
    const p2 = { x: 375, y: 250 - 46 * s };

    const invT = 1 - t;
    const targetX = invT * invT * p0.x + 2 * invT * t * p1.x + t * t * p2.x;
    const targetY = invT * invT * p0.y + 2 * invT * t * p1.y + t * t * p2.y;

    moveCharacterTo(targetX, targetY, 0.45);

    if (t >= 1) {
      slideScene.phase = 'landed';
      slideScene.timer = 0;
      currentEmotion = 1;
      nextEmotionTime = Date.now() + 5000;
      for (let i = 0; i < NUM_POINTS; i++) nodes[i].vx += 5.5;
    }
  } else if (slideScene.phase === 'landed') {
    if (slideScene.timer > 125) {
      slideScene.active = false;
      walker.nextWalkTime = Date.now() + 2000;
    }
  }
}

function drawSlide() {
  if (!slideScene.active) return;
  ctx.save();
  ctx.strokeStyle = '#525660';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(140, 92); ctx.lineTo(140, 264);
  ctx.moveTo(170, 92); ctx.lineTo(170, 264);
  ctx.moveTo(265, 200); ctx.lineTo(265, 264);
  ctx.stroke();

  ctx.strokeStyle = '#a1a1aa';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(95, 264); ctx.lineTo(140, 92);
  ctx.stroke();

  ctx.lineWidth = 3.5;
  for (let i = 1; i <= 5; i++) {
    const ratio = i / 6;
    const sx = 95 + (140 - 95) * ratio;
    const sy = 264 + (92 - 264) * ratio;
    ctx.beginPath();
    ctx.moveTo(sx - 6, sy); ctx.lineTo(sx + 8, sy);
    ctx.stroke();
  }

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(138, 92); ctx.lineTo(168, 92);
  ctx.quadraticCurveTo(235, 225, 385, 254);
  ctx.stroke();

  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(138, 90); ctx.lineTo(168, 90);
  ctx.quadraticCurveTo(235, 223, 385, 252);
  ctx.stroke();
  ctx.restore();
}

// --- ЛОГИКА И ОТРИСОВКА КУБИКОВ ---
function updateBlocksScene() {
  blocksScene.timer++;
  const floorY = canvas.height - MARGIN - 12;

  for (let b of blocksScene.blocks) {
    if (!b.placed && !b.carried) {
      b.vy += 0.45;
      b.y += b.vy;
      if (b.y > floorY) {
        b.y = floorY;
        b.vy = -b.vy * 0.35;
      }
    }
  }

  if (blocksScene.phase === 'falling') {
    if (blocksScene.timer > 65) {
      blocksScene.phase = 'collecting';
      currentEmotion = 0;
    }
  } else if (blocksScene.phase === 'collecting') {
    const b = blocksScene.blocks[blocksScene.currentIdx];
    glideCharacterX(b.x);
    if (Math.abs(center.x - b.x) < 28) {
      b.carried = true;
      blocksScene.phase = 'carrying';
    }
  } else if (blocksScene.phase === 'carrying') {
    const b = blocksScene.blocks[blocksScene.currentIdx];
    b.x = center.x;
    b.y = center.y - 68 * life.scale;

    const approachX = b.x < b.tx ? b.tx - 58 : b.tx + 58;
    glideCharacterX(approachX);

    if (Math.abs(center.x - approachX) < 22) {
      b.carried = false;
      b.placed = true;
      b.x = b.tx;
      b.y = b.ty;
      blocksScene.currentIdx++;

      if (blocksScene.currentIdx >= 4) {
        blocksScene.phase = 'admire';
        blocksScene.timer = 0;
        currentEmotion = 1;
      } else {
        blocksScene.phase = 'collecting';
      }
    }
  } else if (blocksScene.phase === 'admire') {
    glideCharacterX(115);
    if (blocksScene.timer > 150) {
      blocksScene.active = false;
      walker.nextWalkTime = Date.now() + 2000;
    }
  }
}

function drawBlocks() {
  if (!blocksScene.active) return;
  ctx.save();
  for (let b of blocksScene.blocks) {
    const hs = b.size / 2;
    ctx.fillStyle = b.color;
    ctx.strokeStyle = '#111214';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(b.x - hs, b.y - hs, b.size, b.size, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(b.x - hs + 4, b.y - hs + 4, b.size - 8, 5);
  }
  ctx.restore();
}

// --- ЛОГИКА И ОТРИСОВКА ЛАМПОЧКИ ---
function updateBulbScene() {
  bulbScene.timer++;
  const t = bulbScene.timer;

  if (t <= 55) {
    moveCharacterTo(240, 200, 0.12);
  } else if (t > 55 && t <= 110) {
    moveCharacterTo(240, 115, 0.1);
  } else if (t > 110 && t <= 170) {
    const wiggle = Math.sin(t * 0.5) * 6;
    moveCharacterTo(240 + wiggle, 115, 0.25);
    if (t === 155) {
      bulbScene.bulbState = 'lit';
      currentEmotion = 1;
    }
  } else if (t > 170 && t <= 225) {
    moveCharacterTo(240, 200, 0.11);
  } else if (t === 226) {
    bulbScene.ladderVisible = false;
    currentEmotion = 0;
  } else if (t === 286) {
    bulbScene.bulbState = 'broken';
    bulbScene.flashAlpha = 0.85;
    currentEmotion = 3;
    nextEmotionTime = Date.now() + 4500;

    for (let i = 0; i < NUM_POINTS; i++) {
      nodes[i].vy -= (nodes[i].oy < 0 ? 7 : 3);
      nodes[i].vx += (Math.random() - 0.5) * 10;
    }

    for (let k = 0; k < 14; k++) {
      bulbScene.shards.push({ x: 240 + (Math.random() - 0.5) * 16, y: 44 + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.7) * 7, size: 3 + Math.random() * 4, alpha: 1 });
    }
  } else if (t > 380) {
    bulbScene.active = false;
    bulbScene.bulbState = 'none';
    walker.nextWalkTime = Date.now() + 2000;
  }

  if (bulbScene.flashAlpha > 0) bulbScene.flashAlpha = Math.max(0, bulbScene.flashAlpha - 0.06);
}

function drawLadder() {
  if (!bulbScene.ladderVisible) return;
  ctx.save();
  ctx.strokeStyle = '#a1a1aa';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(212, 264); ctx.lineTo(222, 105);
  ctx.moveTo(268, 264); ctx.lineTo(258, 105);
  ctx.stroke();

  ctx.lineWidth = 4;
  for (let y = 125; y <= 245; y += 30) {
    const ratio = (y - 105) / (264 - 105);
    const halfW = 18 + ratio * 10;
    ctx.beginPath();
    ctx.moveTo(240 - halfW, y); ctx.lineTo(240 + halfW, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBulbAndSocket() {
if (!bulbScene.active) return;
ctx.save();
ctx.strokeStyle = '#111214';
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(240, 0); ctx.lineTo(240, 18);
ctx.stroke();
ctx.fillStyle = '#3f424a';
ctx.strokeStyle = '#111214';
ctx.lineWidth = 2.5;
ctx.beginPath();
ctx.roundRect(231, 16, 18, 14, 3);
ctx.fill(); ctx.stroke();
if (bulbScene.bulbState === 'screwing' || bulbScene.bulbState === 'lit') {
const isLit = bulbScene.bulbState === 'lit';
if (isLit) {
const glow = ctx.createRadialGradient(240, 44, 4, 240, 44, 150);
glow.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
glow.addColorStop(0.5, 'rgba(253, 224, 71, 0.15)');
glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
ctx.fillStyle = glow;
ctx.fillRect(0, 0, canvas.width, canvas.height);
}
ctx.fillStyle = isLit ? '#fef08a' : 'rgba(228, 228, 231, 0.35)';
ctx.strokeStyle = '#111214';
ctx.lineWidth = 2.5;
ctx.beginPath();
ctx.arc(240, 44, 14, 0, Math.PI * 2);
ctx.fill(); ctx.stroke();
} else if (bulbScene.bulbState === 'broken') {
ctx.strokeStyle = '#e4e4e7';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(234, 30); ctx.lineTo(236, 37); ctx.lineTo(240, 32); ctx.lineTo(244, 38); ctx.lineTo(246, 30);
ctx.stroke();
}
for (let i = bulbScene.shards.length - 1; i >= 0; i--) {
let s = bulbScene.shards[i];
s.x += s.vx; s.y += s.vy; s.vy += 0.35; s.alpha -= 0.02;
if (s.alpha <= 0) { bulbScene.shards.splice(i, 1); continue; }
ctx.fillStyle = 'rgba(254, 240, 138, ' + s.alpha.toFixed(2) + ')';
ctx.fillRect(s.x, s.y, s.size, s.size);
}
if (bulbScene.flashAlpha > 0) {
ctx.fillStyle = 'rgba(255, 255, 255, ' + bulbScene.flashAlpha.toFixed(2) + ')';
ctx.fillRect(0, 0, canvas.width, canvas.height);
}
ctx.restore();
}
// --- ПАР И СМЕРТЬ ОТ ПЕРЕКУРА ---
function spawnVapor(mouthX, mouthY) {
for (let k = 0; k < 2; k++) {
vaporParticles.push({
x: mouthX + (Math.random() - 0.5) * 10 * life.scale,
y: mouthY + (Math.random() - 0.5) * 4 * life.scale,
vx: -1.0 - Math.random() * 1.8 + center.vx * 0.15,
vy: -1.0 - Math.random() * 1.4,
r: (6 + Math.random() * 7) * life.scale,
alpha: 0.65 + Math.random() * 0.2
});
}
}
function updateAndDrawVapor() {
for (let i = vaporParticles.length - 1; i >= 0; i--) {
let p = vaporParticles[i];
p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy -= 0.012; p.r += 0.55; p.alpha -= 0.0085;
if (p.alpha <= 0) { vaporParticles.splice(i, 1); continue; }
ctx.save();
const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r);
grad.addColorStop(0, 'rgba(240, 244, 248, ' + p.alpha.toFixed(2) + ')');
grad.addColorStop(0.5, 'rgba(235, 240, 245, ' + (p.alpha * 0.5).toFixed(2) + ')');
grad.addColorStop(1, 'rgba(240, 244, 248, 0)');
ctx.fillStyle = grad;
ctx.beginPath();
ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
}
}
function drawDyingSequence(drawLiquidBody) {
life.timer++;
const bodyAlpha = Math.max(0, 1 - life.timer / 90);
if (bodyAlpha > 0) {
ctx.save();
ctx.globalAlpha = bodyAlpha;
drawLiquidBody();
ctx.fillStyle = getBodyColor(1);
ctx.fill();
ctx.lineWidth = 6.5;
ctx.strokeStyle = '#111214';
ctx.lineJoin = 'round';
ctx.stroke();
const fx = center.x;
const fy = center.y;
ctx.strokeStyle = '#111214';
ctx.lineWidth = 4.5;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(fx - 23, fy - 24); ctx.lineTo(fx - 9, fy - 10);
ctx.moveTo(fx - 9, fy - 24); ctx.lineTo(fx - 23, fy - 10);
ctx.moveTo(fx + 3, fy - 22); ctx.lineTo(fx + 17, fy - 8);
ctx.moveTo(fx + 17, fy - 22); ctx.lineTo(fx + 3, fy - 8);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(fx - 22, fy + 18); ctx.lineTo(fx + 14, fy + 22);
ctx.stroke();
ctx.fillStyle = '#f43f5e';
ctx.beginPath();
ctx.arc(fx + 2, fy + 21, 7, 0, Math.PI, false);
ctx.fill();
ctx.stroke();
ctx.restore();
}
if (life.timer > 25 && life.timer < 155) {
life.ghostY -= 1.3;
life.ghostAlpha = Math.max(0, 0.65 - (life.timer - 25) / 130);
ctx.save();
ctx.globalAlpha = life.ghostAlpha;
ctx.fillStyle = '#e0f2fe';
ctx.beginPath();
ctx.arc(center.x + Math.sin(life.timer * 0.1) * 8, life.ghostY, 26, Math.PI, 0);
ctx.lineTo(center.x + 26 + Math.sin(life.timer * 0.1) * 8, life.ghostY + 22);
ctx.lineTo(center.x + Math.sin(life.timer * 0.1) * 8, life.ghostY + 14);
ctx.lineTo(center.x - 26 + Math.sin(life.timer * 0.1) * 8, life.ghostY + 22);
ctx.closePath();
ctx.fill();
ctx.restore();
}
if (life.timer >= 165) triggerRebirth();
}
