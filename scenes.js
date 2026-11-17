let vape = { active: false, timer: 0, duration: 210, nextAutoTime: Date.now() + 10000 + Math.random() * 8000, blueLevel: 0 };
let vaporParticles = [];

let life = { state: 'alive', timer: 0, scale: 1, ghostY: 0, ghostAlpha: 0 };
let bulbScene = { active: false, timer: 0, ladderVisible: false, bulbState: 'none', shards: [], flashAlpha: 0 };
let blocksScene = { active: false, timer: 0, phase: 'falling', currentIdx: 0, blocks: [], shapeType: 0 };
let slideScene = { active: false, phase: 'approach', timer: 0, progress: 0, speed: 0 };
let drinkScene = { active: false, timer: 0, duration: 190 };

let sushiScene = { active: false, timer: 0, duration: 175, eaten: false };
let sushiGame = { active: false, rolls: [], caught: 0, total: 5, winTimer: 0 };

let fightScene = {
  active: false,
  timer: 0,
  phase: 'intro',
  playerWins: true,
  enemy: { x: 420, y: 185, vx: 0, vy: 0, hp: 100, swordAngle: -0.6 },
  playerHp: 100,
  playerSwordAngle: 0.6,
  slashes: [],
  sparks: [],
  flashAlpha: 0
};

function isAnySceneActive() {
  return vape.active || bulbScene.active || blocksScene.active || slideScene.active || fightScene.active || drinkScene.active || sushiScene.active || sushiGame.active || life.state !== 'alive';
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
  fightScene.active = false;
  drinkScene.active = false;
  sushiScene.active = false;
  sushiGame.active = false;
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

function drawRollIcon(x, y, s, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle || 0);
  ctx.scale(s, s);

  ctx.fillStyle = '#fb7185';
  ctx.strokeStyle = '#111214';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-12, -9, 24, 18, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(-9, -6, 18, 12, 4);
  ctx.fill();

  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.arc(-1, -1, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function startSushiScene() {
  if (isAnySceneActive()) return;
  walker.isWalking = false;
  sushiScene.active = true;
  sushiScene.timer = 0;
  sushiScene.eaten = false;
  currentEmotion = 3;
}

function updateSushiScene() {
  sushiScene.timer++;
  const t = sushiScene.timer;

  if (t === 75) {
    sushiScene.eaten = true;
    currentEmotion = 1;
    nextEmotionTime = Date.now() + 5000;
  }

  if (t > 75 && t < 135 && t % 12 === 0) {
    for (let i = 0; i < NUM_POINTS; i++) {
      nodes[i].vy -= (nodes[i].oy < 0 ? 3.5 : 1.5);
    }
  }

  if (t >= sushiScene.duration) {
    sushiScene.active = false;
    walker.nextWalkTime = Date.now() + 2000;
  }
}

function drawSushiScene(fx, fy, s) {
  if (!sushiScene.active) return;
  const t = sushiScene.timer;

  let slideOffset = 0;
  if (t < 30) slideOffset = (30 - t) * 3.5;
  if (t > 135) slideOffset = (t - 135) * 3.5;

  const rx = fx - (22 + slideOffset) * s;
  const ry = fy + (24 + Math.sin(t * 0.2) * 2) * s;

  ctx.save();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = Math.max(2.5, 4 * s);
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(rx - 75 * s, ry - 26 * s);
  ctx.lineTo(rx + 6 * s, ry - 4 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rx - 75 * s, ry - 10 * s);
  ctx.lineTo(rx + 6 * s, ry + 5 * s);
  ctx.stroke();

  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(rx - 75 * s, ry - 26 * s);
  ctx.lineTo(rx + 6 * s, ry - 4 * s);
  ctx.moveTo(rx - 75 * s, ry - 10 * s);
  ctx.lineTo(rx + 6 * s, ry + 5 * s);
  ctx.stroke();

  if (!sushiScene.eaten) {
    drawRollIcon(rx, ry, s * 1.15, -0.15);
  }

  ctx.restore();
}

function startSushiGame() {
  if (isAnySceneActive()) return;
  if (!tiltEnabled) {
    alert('Сначала включите гироскоп кнопкой выше!');
    return;
  }

  walker.isWalking = false;
  sushiGame.active = true;
  sushiGame.caught = 0;
  sushiGame.winTimer = 0;
  sushiGame.rolls = [];
  currentEmotion = 3;

  for (let i = 0; i < sushiGame.total; i++) {
    sushiGame.rolls.push({
      x: 50 + Math.random() * (canvas.width - 100),
      y: 40 + Math.random() * (canvas.height - 100),
      vx: (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 1.6),
      vy: (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 1.5),
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.08,
      caught: false
    });
  }
}

function updateSushiGame() {
  if (!sushiGame.active) return;

  if (sushiGame.caught >= sushiGame.total) {
    sushiGame.winTimer++;
    currentEmotion = 1;
    if (sushiGame.winTimer > 120) {
      sushiGame.active = false;
    }
    return;
  }

  const catchRadius = 64 * life.scale;

  for (let r of sushiGame.rolls) {
    if (r.caught) continue;

    r.x += r.vx;
    r.y += r.vy;
    r.angle += r.spin;

    if (r.x < 22) { r.x = 22; r.vx = Math.abs(r.vx); }
    if (r.x > canvas.width - 22) { r.x = canvas.width - 22; r.vx = -Math.abs(r.vx); }
    if (r.y < 28) { r.y = 28; r.vy = Math.abs(r.vy); }
    if (r.y > canvas.height - 22) { r.y = canvas.height - 22; r.vy = -Math.abs(r.vy); }

    if (Math.hypot(r.x - center.x, r.y - center.y) < catchRadius) {
      r.caught = true;
      sushiGame.caught++;
      currentEmotion = 1;
      nextEmotionTime = Date.now() + 2000;
      for (let i = 0; i < NUM_POINTS; i++) {
        nodes[i].vy -= (nodes[i].oy < 0 ? 5 : 2);
      }
    }
  }
}

function drawSushiGame() {
  if (!sushiGame.active) return;

  for (let r of sushiGame.rolls) {
    if (!r.caught) {
      drawRollIcon(r.x, r.y, 1.1, r.angle);
    }
  }

  ctx.save();
  ctx.fillStyle = 'rgba(24, 24, 27, 0.75)';
  ctx.strokeStyle = '#52525b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 85, 10, 170, 28, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  if (sushiGame.caught >= sushiGame.total) {
    ctx.fillStyle = '#4ade80';
    ctx.fillText('ВСЕ РОЛЛЫ ПОЙМАНЫ!', canvas.width / 2, 29);
  } else {
    ctx.fillText('Роллы: ' + sushiGame.caught + ' / ' + sushiGame.total, canvas.width / 2, 29);
  }
  ctx.restore();
}

function startFightScene() {
  if (isAnySceneActive()) return;
  walker.isWalking = false;
  fightScene.active = true;
  fightScene.timer = 0;
  fightScene.phase = 'intro';
  fightScene.playerWins = Math.random() < 0.5;
  fightScene.enemy = { x: 430, y: 185, vx: 0, vy: 0, hp: 100, swordAngle: -0.6 };
  fightScene.playerHp = 100;
  fightScene.playerSwordAngle = 0.6;
  fightScene.slashes = [];
  fightScene.sparks = [];
  fightScene.flashAlpha = 0;
  currentEmotion = 0;
}

function spawnHitSparks(x, y, color) {
  for (let i = 0; i < 16; i++) {
    fightScene.sparks.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 14,
      size: 2.5 + Math.random() * 4.5,
      color: color,
      alpha: 1
    });
  }
}

function addSlashTrail(x, y, radius, startAng, endAng, color) {
  fightScene.slashes.push({
    x: x,
    y: y,
    radius: radius,
    startAng: startAng,
    endAng: endAng,
    color: color,
    alpha: 0.95
  });
}

function updateFightScene() {
  fightScene.timer++;
  const t = fightScene.timer;
  const e = fightScene.enemy;
  const floorY = canvas.height - MARGIN - 54 * life.scale;

  e.vy += 0.42;
  e.x += e.vx;
  e.y += e.vy;
  e.vx *= 0.88;
  if (e.y > floorY) {
    e.y = floorY;
    e.vy = 0;
  }
if (fightScene.phase !== 'outro' || !fightScene.playerWins) {
e.x = Math.max(60, Math.min(canvas.width - 60, e.x));
}
fightScene.playerSwordAngle += (0.55 - fightScene.playerSwordAngle) * 0.15;
e.swordAngle += (-0.55 - e.swordAngle) * 0.15;
if (fightScene.flashAlpha > 0) {
fightScene.flashAlpha = Math.max(0, fightScene.flashAlpha - 0.08);
}
if (fightScene.phase === 'intro') {
moveCharacterTo(115, floorY, 0.12);
e.x += (365 - e.x) * 0.12;
if (t >= 135) {
fightScene.phase = 'fighting';
fightScene.timer = 0;
fightScene.flashAlpha = 0.85;
}
} else if (fightScene.phase === 'fighting') {
if (t === 15) {
for (let n of nodes) { n.vx += 18; n.vy -= 9; }
fightScene.playerSwordAngle = -1.2;
}
if (t === 32) {
fightScene.playerSwordAngle = 1.6;
addSlashTrail(center.x + 25, center.y, 75, -1.1, 1.3, '#38bdf8');
e.vx = 20; e.vy = -8;
e.hp = 65;
fightScene.flashAlpha = 0.55;
spawnHitSparks((center.x + e.x) / 2, center.y, '#38bdf8');
}
if (t === 80) {
e.vx = -22; e.vy = -9;
e.swordAngle = 1.2;
}
if (t === 96) {
e.swordAngle = -1.7;
addSlashTrail(e.x - 25, e.y, 75, 1.8, 4.2, '#ef4444');
for (let n of nodes) { n.vx -= 18; n.vy -= 7; }
fightScene.playerHp = 60;
currentEmotion = 3;
fightScene.flashAlpha = 0.55;
spawnHitSparks((center.x + e.x) / 2, center.y, '#ef4444');
}
if (t === 140) {
currentEmotion = 0;
for (let n of nodes) { n.vx += 16; n.vy -= 11; }
e.vx = -16; e.vy = -11;
fightScene.playerSwordAngle = -1.1;
e.swordAngle = 1.1;
}
if (t === 156) {
fightScene.playerSwordAngle = 1.4;
e.swordAngle = -1.4;
addSlashTrail(240, 145, 80, -0.8, 0.8, '#38bdf8');
addSlashTrail(240, 145, 80, 2.3, 3.9, '#ef4444');
for (let n of nodes) { n.vx -= 12; n.vy -= 4; }
e.vx = 12; e.vy = -4;
fightScene.playerHp = 35;
e.hp = 35;
fightScene.flashAlpha = 0.85;
spawnHitSparks(240, 140, '#facc15');
}
if (fightScene.playerWins) {
if (t === 195) {
for (let n of nodes) { n.vx += 24; n.vy -= 11; }
fightScene.playerSwordAngle = -1.4;
}
if (t === 212) {
fightScene.playerSwordAngle = 1.9;
addSlashTrail(center.x + 30, center.y, 85, -1.3, 1.5, '#38bdf8');
e.vx = 38; e.vy = -15;
e.hp = 0;
fightScene.flashAlpha = 0.95;
spawnHitSparks(e.x - 20, e.y, '#ef4444');
fightScene.phase = 'outro';
fightScene.timer = 0;
currentEmotion = 1;
}
} else {
if (t === 195) {
e.vx = -26; e.vy = -11;
e.swordAngle = 1.4;
}
if (t === 212) {
e.swordAngle = -1.9;
addSlashTrail(e.x - 30, e.y, 85, 1.6, 4.4, '#ef4444');
for (let n of nodes) { n.vx -= 34; n.vy -= 14; }
fightScene.playerHp = 0;
fightScene.flashAlpha = 0.95;
spawnHitSparks(center.x + 20, center.y, '#38bdf8');
fightScene.phase = 'outro';
fightScene.timer = 0;
currentEmotion = 2;
}
}
} else if (fightScene.phase === 'outro') {
if (fightScene.playerWins) {
e.x += 14;
moveCharacterTo(240, floorY, 0.08);
} else {
if (t < 80) {
if (t % 25 === 0) e.vy = -8;
e.x += (330 - e.x) * 0.08;
} else {
e.x += 12;
}
}
if (t > 120) {
fightScene.active = false;
walker.nextWalkTime = Date.now() + 2000;
nextEmotionTime = Date.now() + 4000;
}
}
}
function drawKatana(x, y, angle, bladeColor, glowColor, flip) {
ctx.save();
ctx.translate(x, y);
if (flip) ctx.scale(-1, 1);
ctx.rotate(angle);
ctx.fillStyle = '#18181b';
ctx.strokeStyle = '#71717a';
ctx.lineWidth = 1.5;
ctx.fillRect(-16, -2.5, 16, 5);
ctx.strokeRect(-16, -2.5, 16, 5);
ctx.fillStyle = '#eab308';
ctx.fillRect(0, -6, 3.5, 12);
ctx.shadowColor = glowColor;
ctx.shadowBlur = 10;
ctx.fillStyle = bladeColor;
ctx.beginPath();
ctx.moveTo(3.5, -2.5);
ctx.lineTo(68, -2);
ctx.lineTo(76, 0);
ctx.lineTo(68, 2.5);
ctx.lineTo(3.5, 2.5);
ctx.closePath();
ctx.fill();
ctx.restore();
}
function drawFightScene() {
if (!fightScene.active) return;
const e = fightScene.enemy;
const t = fightScene.timer;
ctx.save();
if (e.x < canvas.width + 80) {
ctx.save();
ctx.translate(e.x, e.y);
const squashY = 1 + Math.sin(t * 0.25) * 0.05;
const squashX = 1 - Math.sin(t * 0.25) * 0.05;
ctx.scale(squashX, squashY);
ctx.shadowColor = '#ef4444';
ctx.shadowBlur = 16;
ctx.fillStyle = '#09090b';
ctx.strokeStyle = '#ef4444';
ctx.lineWidth = 3.5;
ctx.beginPath();
ctx.ellipse(0, 0, 56, 52, 0, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();
ctx.shadowBlur = 10;
ctx.fillStyle = '#ef4444';
ctx.beginPath();
ctx.ellipse(-18, -12, 9, 13, 0.15, 0, Math.PI * 2);
ctx.ellipse(4, -14, 9, 13, -0.1, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = '#09090b';
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(-28, -24); ctx.lineTo(-10, -16);
ctx.moveTo(14, -25); ctx.lineTo(-4, -17);
ctx.stroke();
ctx.restore();
drawKatana(e.x - 36, e.y + 8, e.swordAngle, '#fca5a5', '#ef4444', true);
}
drawKatana(center.x + 36 * life.scale, center.y + 8 * life.scale, fightScene.playerSwordAngle, '#e0f2fe', '#38bdf8', false);
for (let i = fightScene.slashes.length - 1; i >= 0; i--) {
let sl = fightScene.slashes[i];
sl.alpha -= 0.07;
if (sl.alpha <= 0) {
fightScene.slashes.splice(i, 1);
continue;
}
ctx.save();
ctx.globalAlpha = sl.alpha;
ctx.strokeStyle = sl.color;
ctx.shadowColor = sl.color;
ctx.shadowBlur = 14;
ctx.lineWidth = 9;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.arc(sl.x, sl.y, sl.radius, sl.startAng, sl.endAng);
ctx.stroke();
ctx.restore();
}
ctx.fillStyle = '#18181b';
ctx.strokeStyle = '#71717a';
ctx.lineWidth = 2;
ctx.fillRect(18, 14, 175, 14);
ctx.strokeRect(18, 14, 175, 14);
ctx.fillStyle = '#38bdf8';
ctx.fillRect(20, 16, Math.max(0, 171 * (fightScene.playerHp / 100)), 10);
ctx.fillStyle = '#18181b';
ctx.fillRect(canvas.width - 193, 14, 175, 14);
ctx.strokeRect(canvas.width - 193, 14, 175, 14);
ctx.fillStyle = '#ef4444';
const enemyBarW = Math.max(0, 171 * (e.hp / 100));
ctx.fillRect(canvas.width - 22 - enemyBarW, 16, enemyBarW, 10);
if (fightScene.phase === 'intro') {
const slideIn = Math.min(1, t / 18);
ctx.fillStyle = 'rgba(9, 9, 11, 0.78)';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#1e3a8a';
ctx.strokeStyle = '#38bdf8';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(-20, 48);
ctx.lineTo(215 * slideIn, 48);
ctx.lineTo(190 * slideIn, 96);
ctx.lineTo(-20, 96);
ctx.closePath();
ctx.fill();
ctx.stroke();
ctx.fillStyle = '#7f1d1d';
ctx.strokeStyle = '#ef4444';
ctx.beginPath();
ctx.moveTo(canvas.width + 20, 48);
ctx.lineTo(canvas.width - 215 * slideIn, 48);
ctx.lineTo(canvas.width - 190 * slideIn, 96);
ctx.lineTo(canvas.width + 20, 96);
ctx.closePath();
ctx.fill();
ctx.stroke();
ctx.fillStyle = '#ffffff';
ctx.font = '900 20px -apple-system, sans-serif';
ctx.textAlign = 'left';
ctx.fillText('КАМЕНЬ', 24 * slideIn, 79);
ctx.textAlign = 'right';
ctx.fillText('ТЕНЬ', canvas.width - 24 * slideIn, 79);
ctx.textAlign = 'center';
if (t < 80) {
ctx.fillStyle = '#facc15';
ctx.shadowColor = '#facc15';
ctx.shadowBlur = 12;
ctx.font = '900 32px -apple-system, sans-serif';
ctx.fillText('VS', canvas.width / 2, 83);
} else {
const pulse = 1 + Math.sin((t - 80) * 0.4) * 0.1;
ctx.save();
ctx.translate(canvas.width / 2, 138);
ctx.scale(pulse, pulse);
ctx.fillStyle = '#ef4444';
ctx.shadowColor = '#ef4444';
ctx.shadowBlur = 18;
ctx.font = '900 48px -apple-system, sans-serif';
ctx.fillText('FIGHT!', 0, 0);
ctx.restore();
}
} else if (fightScene.phase === 'outro' && t < 95) {
ctx.textAlign = 'center';
if (fightScene.playerWins) {
ctx.fillStyle = '#facc15';
ctx.shadowColor = '#facc15';
ctx.shadowBlur = 15;
ctx.font = '900 40px -apple-system, sans-serif';
ctx.fillText('ПОБЕДА!', canvas.width / 2, 86);
} else {
ctx.fillStyle = '#ef4444';
ctx.shadowColor = '#ef4444';
ctx.shadowBlur = 15;
ctx.font = '900 36px -apple-system, sans-serif';
ctx.fillText('ПОРАЖЕНИЕ!', canvas.width / 2, 86);
}
}
for (let i = fightScene.sparks.length - 1; i >= 0; i--) {
let s = fightScene.sparks[i];
s.x += s.vx; s.y += s.vy; s.vy += 0.4; s.alpha -= 0.04;
if (s.alpha <= 0) { fightScene.sparks.splice(i, 1); continue; }
ctx.fillStyle = s.color;
ctx.globalAlpha = s.alpha;
ctx.fillRect(s.x, s.y, s.size, s.size);
}
ctx.globalAlpha = 1;
if (fightScene.flashAlpha > 0) {
ctx.fillStyle = 'rgba(255, 255, 255, ' + fightScene.flashAlpha.toFixed(2) + ')';
ctx.fillRect(0, 0, canvas.width, canvas.height);
}
ctx.restore();
}
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
function startDrinkScene() {
if (isAnySceneActive()) return;
walker.isWalking = false;
drinkScene.active = true;
drinkScene.timer = 0;
currentEmotion = 1;
}
function updateDrinkScene() {
drinkScene.timer++;
const t = drinkScene.timer;
if (t > 25 && t < 155) {
for (let i = 0; i < NUM_POINTS; i++) {
if (nodes[i].oy < 0) {
nodes[i].vx += Math.sin(t * 0.25) * 0.45;
}
}
}
if (t === 155) {
currentEmotion = 1;
nextEmotionTime = Date.now() + 5000;
for (let i = 0; i < NUM_POINTS; i++) {
nodes[i].vy -= (nodes[i].oy < 0 ? 5 : 2);
}
}
if (t >= drinkScene.duration) {
drinkScene.active = false;
walker.nextWalkTime = Date.now() + 2000;
}
}
function drawWhiskeyBottle(x, y, angle, s, liquidLevel) {
ctx.save();
ctx.translate(x, y);
ctx.rotate(angle);
ctx.scale(s, s);
ctx.fillStyle = 'rgba(217, 119, 6, 0.35)';
ctx.strokeStyle = '#111214';
ctx.lineWidth = 2.5;
ctx.beginPath();
ctx.roundRect(-14, -18, 28, 44, 4);
ctx.fill();
ctx.stroke();
const fillH = 38 * liquidLevel;
if (fillH > 0) {
ctx.fillStyle = '#b45309';
ctx.fillRect(-12, 24 - fillH, 24, fillH);
}
ctx.fillStyle = 'rgba(217, 119, 6, 0.45)';
ctx.beginPath();
ctx.moveTo(-14, -18);
ctx.lineTo(-6, -28);
ctx.lineTo(6, -28);
ctx.lineTo(14, -18);
ctx.closePath();
ctx.fill();
ctx.stroke();
ctx.fillStyle = '#18181b';
ctx.fillRect(-6, -44, 12, 16);
ctx.strokeRect(-6, -44, 12, 16);
ctx.fillStyle = '#09090b';
ctx.fillRect(-13, -11, 26, 28);
ctx.strokeStyle = '#e4e4e7';
ctx.lineWidth = 1;
ctx.strokeRect(-11, -9, 22, 24);
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 11px serif';
ctx.textAlign = 'center';
ctx.fillText('7', 0, 7);
ctx.restore();
}
function drawDrinkScene(fx, fy, s) {
if (!drinkScene.active) return;
const t = drinkScene.timer;
let slideOffset = 0;
if (t < 20) slideOffset = (20 - t) * 4;
if (t > 165) slideOffset = (t - 165) * 4;
let tiltAngle = 0.25;
let drinkLiftY = 36;
if (t >= 20 && t <= 155) {
tiltAngle = 0.72 + Math.sin(t * 0.25) * 0.08;
drinkLiftY = 44;
}
const progress = Math.max(0, Math.min(1, (t - 25) / 130));
const liquidLevel = 0.85 - progress * 0.55;
drawWhiskeyBottle(
fx - (34 + slideOffset) * s,
fy + (drinkLiftY + slideOffset * 0.5) * s,
tiltAngle,
s,
liquidLevel
);
}
