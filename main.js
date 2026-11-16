const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const video = document.getElementById('pipVideo');
const btn = document.getElementById('pipBtn');
const tiltBtn = document.getElementById('tiltBtn');

const emotions = ['classic', 'happy', 'sad', 'surprised'];
let currentEmotion = 0;
let nextEmotionTime = Date.now() + 5000 + Math.random() * 4000;

let walker = { isWalking: false, targetX: 240, nextWalkTime: Date.now() + 1500 };

const NUM_POINTS = 16;
let nodes = [];
let center = { x: 240, y: 155, vx: 0, vy: 0 };
let isDragging = false;
let dragMoved = false;
let lastPointer = { x: 0, y: 0 };

let gravity = { x: 0, y: 0.42 };
let tiltEnabled = false;

const STIFFNESS = 0.075;
const NEIGHBOR_PULL = 0.14;
const DAMPING = 0.87;
const MARGIN = 6;

function initNodes(customScale) {
  const s = customScale || life.scale || 1;
  nodes = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const angle = (i / NUM_POINTS) * Math.PI * 2;
    let baseR = 62 * s;
    if (Math.sin(angle) > 0) baseR += Math.sin(angle) * 9 * s;
    if (Math.cos(angle) < 0 && Math.sin(angle) > 0) baseR += 4 * s;
    const ox = Math.cos(angle) * baseR;
    const oy = Math.sin(angle) * (baseR * 0.94);
    nodes.push({ ox, oy, x: center.x + ox, y: center.y + oy, vx: 0, vy: 0 });
  }
}
initNodes(1);

function updateNodeScale(s) {
  for (let i = 0; i < NUM_POINTS; i++) {
    const angle = (i / NUM_POINTS) * Math.PI * 2;
    let baseR = 62 * s;
    if (Math.sin(angle) > 0) baseR += Math.sin(angle) * 9 * s;
    if (Math.cos(angle) < 0 && Math.sin(angle) > 0) baseR += 4 * s;
    nodes[i].ox = Math.cos(angle) * baseR;
    nodes[i].oy = Math.sin(angle) * (baseR * 0.94);
  }
}

function nextEmotion(step) {
  if (typeof step !== 'number') step = 1;
  currentEmotion = (currentEmotion + step + emotions.length) % emotions.length;
  nextEmotionTime = Date.now() + 5000 + Math.random() * 4000;
}

function pokeJelly(step) {
  if (isAnySceneActive() && !vape.active) return;
  if (typeof step !== 'number') step = 1;
  walker.isWalking = false;
  walker.nextWalkTime = Date.now() + 2500;
  if (Math.random() < 0.25 && !vape.active && life.state === 'alive') {
    startVape();
  } else {
    nextEmotion(step);
  }
  const slideVx = (Math.random() - 0.5) * 14;
  for (let i = 0; i < NUM_POINTS; i++) {
    const factor = nodes[i].oy < 0 ? 1.4 : 0.6;
    nodes[i].vx += slideVx * factor;
    nodes[i].vy += (nodes[i].oy < 0 ? 3.5 : -1.5);
  }
}

function handleOrientation(e) {
  if (!tiltEnabled || e.gamma === null || e.beta === null) return;
  gravity.x = Math.max(-0.7, Math.min(0.7, e.gamma * 0.018));
  gravity.y = Math.max(-0.7, Math.min(0.7, (e.beta - 35) * 0.018));
}

function handleMotion(e) {
  if (!tiltEnabled) return;
  const pureAcc = e.acceleration;
  if (pureAcc && (Math.abs(pureAcc.x) > 13 || Math.abs(pureAcc.y) > 13)) pokeJelly(1);
}

tiltBtn.addEventListener('click', async () => {
  if (!tiltEnabled) {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          alert('Доступ к гироскопу отклонен. Перезагрузите страницу и нажмите «Разрешить».');
          return;
        }
      }
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        await DeviceMotionEvent.requestPermission();
      }
    } catch (err) {
      alert('Ошибка доступа к датчикам: ' + err.message);
      return;
    }

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);
    tiltEnabled = true;
    walker.isWalking = false;
    tiltBtn.textContent = 'Гироскоп: ВКЛ';
    tiltBtn.classList.add('active');
  } else {
    tiltEnabled = false;
    window.removeEventListener('deviceorientation', handleOrientation);
    window.removeEventListener('devicemotion', handleMotion);
    gravity = { x: 0, y: 0.42 };
    tiltBtn.textContent = 'Гироскоп: ВЫКЛ';
    tiltBtn.classList.remove('active');
    walker.nextWalkTime = Date.now() + 1500;
  }
});

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = (e.touches && e.touches.length > 0) ? e.touches.clientX : e.clientX;
  const clientY = (e.touches && e.touches.length > 0) ? e.touches.clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

canvas.addEventListener('pointerdown', (e) => {
  if (bulbScene.active || blocksScene.active || slideScene.active || life.state === 'dying') return;
  const pos = getPos(e);
  if (Math.hypot(pos.x - center.x, pos.y - center.y) <= 95 * life.scale + 15) {
    isDragging = true;
    walker.isWalking = false;
    dragMoved = false;
    lastPointer = { x: pos.x, y: pos.y };
    for (let n of nodes) {
      n.vx += (n.x - pos.x) * 0.08;
      n.vy += (n.y - pos.y) * 0.08;
    }
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDragging || bulbScene.active || blocksScene.active || slideScene.active || life.state === 'dying') return;
  const pos = getPos(e);
  const dx = pos.x - lastPointer.x;
  const dy = pos.y - lastPointer.y;
  if (Math.hypot(dx, dy) > 3) dragMoved = true;

  for (let n of nodes) {
    const dist = Math.hypot(n.x - pos.x, n.y - pos.y);
    const weight = Math.max(0.25, 1 - dist / 165);
    n.x += dx * weight;
    n.y += dy * weight;
    n.vx = dx * 0.75;
    n.vy = dy * 0.75;
  }
  lastPointer = { x: pos.x, y: pos.y };
});

canvas.addEventListener('pointerup', () => {
  if (isDragging) {
    if (!dragMoved) pokeJelly(1);
    isDragging = false;
    walker.nextWalkTime = Date.now() + 2500;
  }
});

function moveCharacterTo(tx, ty, speed) {
  const dx = tx - center.x;
  const dy = ty - center.y;
  for (let n of nodes) {
    n.x += dx * speed;
    n.y += dy * speed;
    n.vx = dx * speed * 0.5;
    n.vy = dy * speed * 0.5;
  }
}

function glideCharacterX(tx) {
  const distX = tx - center.x;
  if (Math.abs(distX) > 4) {
    const dir = Math.sign(distX);
    const speed = Math.min(0.95, Math.abs(distX) * 0.035);
    for (let i = 0; i < NUM_POINTS; i++) {
      const lean = nodes[i].oy < 0 ? 1.15 : 0.9;
      nodes[i].vx += dir * speed * lean;
    }
  }
}

function updateSlidingAI() {
  if (isDragging || isAnySceneActive() || tiltEnabled) return;

  const now = Date.now();
  if (!walker.isWalking && now > walker.nextWalkTime) {
    const mid = canvas.width / 2;
    walker.targetX = center.x < mid ? (mid + 20 + Math.random() * (mid - 105)) : (85 + Math.random() * (mid - 105));
    walker.isWalking = true;
  }

  if (walker.isWalking) {
    const distX = walker.targetX - center.x;
    if (Math.abs(distX) < 12) {
      walker.isWalking = false;
      walker.nextWalkTime = now + 2000 + Math.random() * 3000;
      if (Math.random() < 0.45) nextEmotion(1);
    } else if (center.y > canvas.height - 95) {
      const dir = Math.sign(distX);
      const glideSpeed = dir > 0 ? 0.42 : 0.36;
      for (let i = 0; i < NUM_POINTS; i++) {
        const lean = nodes[i].oy < 0 ? 1.15 : 0.9;
        nodes[i].vx += dir * glideSpeed * lean;
      }
    }
  }
}

function updateLiquidPhysics() {
  let sumX = 0, sumY = 0, sumVx = 0, sumVy = 0;
  for (let i = 0; i < NUM_POINTS; i++) {
    sumX += nodes[i].x; sumY += nodes[i].y;
    sumVx += nodes[i].vx; sumVy += nodes[i].vy;
  }
  center.x = sumX / NUM_POINTS; center.y = sumY / NUM_POINTS;
  center.vx = sumVx / NUM_POINTS; center.vy = sumVy / NUM_POINTS;

  if (isNaN(center.x) || isNaN(center.y)) {
    center.x = 240; center.y = 155;
    initNodes(life.scale);
    return;
  }

  const disableGravity = isDragging || (bulbScene.active && bulbScene.timer <= 225) || (slideScene.active && slideScene.phase !== 'landed');

  for (let i = 0; i < NUM_POINTS; i++) {
    let n = nodes[i];
    let prev = nodes[(i - 1 + NUM_POINTS) % NUM_POINTS];
    let next = nodes[(i + 1) % NUM_POINTS];

    if (!disableGravity) {
      n.vx += gravity.x;
      n.vy += gravity.y;
    }

    n.vx += (center.x + n.ox - n.x) * STIFFNESS;
    n.vy += (center.y + n.oy - n.y) * STIFFNESS;

    n.vx += ((prev.x + next.x) * 0.5 - n.x) * NEIGHBOR_PULL;
    n.vy += ((prev.y + next.y) * 0.5 - n.y) * NEIGHBOR_PULL;

    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;

    if (n.y > canvas.height - MARGIN) {
      if (n.vy > 11 && !isAnySceneActive()) nextEmotion(1);
      n.y = canvas.height - MARGIN;
      n.vy = -n.vy * 0.25;
      n.vx *= (walker.isWalking || tiltEnabled || blocksScene.active || slideScene.active) ? 0.94 : 0.82;
    }
    if (n.y < MARGIN) { n.y = MARGIN; n.vy = -n.vy * 0.45; }
    if (n.x > canvas.width - MARGIN) { n.x = canvas.width - MARGIN; n.vx = -n.vx * 0.45; n.vy *= 0.85; }
    if (n.x < MARGIN) { n.x = MARGIN; n.vx = -n.vx * 0.45; n.vy *= 0.85; }
  }
}

function drawLiquidBody() {
  ctx.beginPath();
  for (let i = 0; i < NUM_POINTS; i++) {
    let curr = nodes[i];
    let next = nodes[(i + 1) % NUM_POINTS];
    let midX = (curr.x + next.x) * 0.5;
    let midY = (curr.y + next.y) * 0.5;
    if (i === 0) {
      let prev = nodes[NUM_POINTS - 1];
      ctx.moveTo((prev.x + curr.x) * 0.5, (prev.y + curr.y) * 0.5);
    }
    ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
  }
  ctx.closePath();
}

let frame = 0;

function drawCharacter() {
  if (life.state === 'reborn') {
    life.timer++;
    if (life.scale < 1.0) {
      life.scale = Math.min(1.0, life.scale + 0.0022);
      updateNodeScale(life.scale);
    } else {
      life.state = 'alive';
      walker.nextWalkTime = Date.now() + 1500;
    }
  }

  if (!vape.active && life.state === 'alive' && vape.blueLevel > 0) {
    vape.blueLevel = Math.max(0, vape.blueLevel - 0.0004);
  }

  if (bulbScene.active) updateBulbScene();
  else if (blocksScene.active) updateBlocksScene();
else if (slideScene.active) updateSlideScene();
  else if (fightScene.active) updateFightScene();
else updateSlidingAI();
updateLiquidPhysics();
const now = Date.now();
if (!isAnySceneActive() && !isDragging && now > nextEmotionTime) nextEmotion(1);
if (!isAnySceneActive() && !isDragging && !walker.isWalking && now > vape.nextAutoTime) startVape();
ctx.fillStyle = '#232529';
ctx.fillRect(0, 0, canvas.width, canvas.height);
drawLadder();
drawSlide();
if (life.state === 'dying') {
drawDyingSequence(drawLiquidBody);
updateAndDrawVapor();
frame++;
requestAnimationFrame(drawCharacter);
return;
}
const s = life.scale;
const shiverX = vape.blueLevel > 0.65 ? (Math.random() - 0.5) * 3 : 0;
const costume = costumes[currentCostume];
drawBatmanCape(ctx, center, s, frame);
drawLiquidBody();
ctx.fillStyle = getBodyColor(vape.blueLevel);
ctx.fill();
ctx.save();
ctx.clip();
ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
ctx.beginPath();
ctx.ellipse(center.x - 22 * s, center.y - 30 * s, 22 * s, 11 * s, -0.4, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
const lookX = Math.max(-11 * s, Math.min(11 * s, center.vx * 1.4)) + shiverX;
const lookY = Math.max(-9 * s, Math.min(9 * s, center.vy * 0.65));
const fx = center.x + lookX;
const fy = center.y + lookY;
drawCostumeDetails(ctx, center, fx, fy, s, drawLiquidBody);
drawLiquidBody();
ctx.lineWidth = Math.max(3.5, 6.5 * s);
ctx.strokeStyle = '#111214';
ctx.lineJoin = 'round';
ctx.stroke();
const emo = emotions[currentEmotion];
const isBlinking = (frame % 170) > 162 && emo !== 'surprised';
if (costume === 'joker') {
ctx.fillStyle = 'rgba(24, 24, 27, 0.65)';
ctx.beginPath();
ctx.ellipse(fx - 16 * s, fy - 17 * s, 15 * s, 20 * s, -0.05, 0, Math.PI * 2);
ctx.ellipse(fx + 10 * s, fy - 15 * s, 15 * s, 20 * s, 0.05, 0, Math.PI * 2);
ctx.fill();
} else if (costume !== 'batman' && costume !== 'myers') {
ctx.fillStyle = '#c93b3b';
ctx.beginPath();
ctx.ellipse(fx + 13 * s, fy + 4 * s, 8 * s, 5.5 * s, 0.2, 0, Math.PI * 2);
ctx.fill();
}
function drawCartoonEyes(pupilOffsetY, leftClosed, rightClosed) {
ctx.fillStyle = '#ffffff';
ctx.strokeStyle = '#111214';
ctx.lineWidth = Math.max(1.8, 3 * s);
ctx.beginPath();
ctx.ellipse(fx - 16 * s, fy - 17 * s, 12 * s, (leftClosed ? 2 : 17) * s, -0.05, 0, Math.PI * 2);
ctx.fill(); ctx.stroke();
ctx.beginPath();
ctx.ellipse(fx + 10 * s, fy - 15 * s, 12 * s, (rightClosed ? 2 : 17) * s, 0.05, 0, Math.PI * 2);
ctx.fill(); ctx.stroke();
if (costume === 'myers') {
ctx.fillStyle = '#111214';
ctx.beginPath();
ctx.ellipse(fx - 16 * s, fy - 17 * s, 10 * s, (leftClosed ? 2 : 14) * s, -0.05, 0, Math.PI * 2);
ctx.ellipse(fx + 10 * s, fy - 15 * s, 10 * s, (rightClosed ? 2 : 14) * s, 0.05, 0, Math.PI * 2);
ctx.fill();
} else if (costume !== 'batman') {
ctx.fillStyle = '#111214';
if (!leftClosed) {
ctx.beginPath();
ctx.arc(fx - 16 * s + lookX * 0.3, fy - 17 * s + pupilOffsetY * s, 4.8 * s, 0, Math.PI * 2);
ctx.fill();
}
if (!rightClosed) {
ctx.beginPath();
ctx.arc(fx + 10 * s + lookX * 0.3, fy - 15 * s + pupilOffsetY * s, 4.8 * s, 0, Math.PI * 2);
ctx.fill();
}
}
}
ctx.strokeStyle = costume === 'joker' ? '#dc2626' : '#111214';
ctx.lineWidth = Math.max(3, 6 * s);
ctx.lineCap = 'round';
if (vape.active) {
vape.timer++;
const isInhaling = vape.timer < 85;
const isExhaling = vape.timer >= 85 && vape.timer < 175;
if (isInhaling) {
vape.blueLevel = Math.min(1.0, vape.blueLevel + 0.0038);
if (vape.blueLevel >= 1.0) {
triggerDeath();
frame++;
requestAnimationFrame(drawCharacter);
return;
}
}
drawCartoonEyes(2.5, isInhaling, false);
ctx.fillStyle = costume === 'joker' ? '#dc2626' : '#111214';
ctx.beginPath();
ctx.arc(fx - 15 * s, fy + 22 * s, (isExhaling ? 7 : 5) * s, 0, Math.PI * 2);
ctx.fill();
let slideOffset = 0;
if (vape.timer < 20) slideOffset = (20 - vape.timer) * 3;
if (vape.timer > 180) slideOffset = (vape.timer - 180) * 3;
ctx.save();
ctx.translate(fx - (32 + slideOffset) * s, fy + (28 + slideOffset * 0.5) * s);
ctx.rotate(-0.45);
ctx.scale(s, s);
ctx.fillStyle = '#2b2d33';
ctx.strokeStyle = '#111214';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.roundRect(-30, -6, 32, 12, 5);
ctx.fill(); ctx.stroke();
ctx.fillStyle = '#111214';
ctx.fillRect(0, -4.5, 8, 9);
ctx.fillStyle = isInhaling ? '#38bdf8' : '#525660';
ctx.beginPath();
ctx.arc(-22, 0, 2.5, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
if (isExhaling && vape.timer % 2 === 0) spawnVapor(fx - 18 * s, fy + 20 * s);
if (vape.timer >= vape.duration) {
vape.active = false;
walker.nextWalkTime = Date.now() + 2000;
}
} else {
const bulbLookOffset = (bulbScene.active && bulbScene.timer > 110 && bulbScene.timer < 295) ? -4.5 : 0;
if (costume === 'joker' && emo !== 'surprised') {
drawCartoonEyes(bulbLookOffset, isBlinking, isBlinking);
ctx.beginPath();
ctx.arc(fx - 4 * s, fy + 10 * s, 25 * s, 0.08 * Math.PI, 0.92 * Math.PI);
ctx.stroke();
} else if (emo === 'classic') {
drawCartoonEyes(bulbLookOffset, isBlinking, isBlinking);
ctx.beginPath(); ctx.moveTo(fx - 30 * s, fy + 18 * s); ctx.lineTo(fx + 18 * s, fy + 26 * s); ctx.stroke();
} else if (emo === 'happy') {
drawCartoonEyes(-2.5 + bulbLookOffset, isBlinking, isBlinking);
ctx.beginPath(); ctx.arc(fx - 5 * s, fy + 16 * s, 19 * s, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
} else if (emo === 'sad') {
drawCartoonEyes(3.5, isBlinking, isBlinking);
ctx.beginPath(); ctx.arc(fx - 5 * s, fy + 35 * s, 17 * s, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
} else if (emo === 'surprised') {
drawCartoonEyes(bulbLookOffset, false, false);
ctx.fillStyle = costume === 'joker' ? '#dc2626' : '#111214';
ctx.beginPath(); ctx.ellipse(fx - 5 * s, fy + 25 * s, 9 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();
}
}
drawBlocks();
drawBulbAndSocket();
updateAndDrawVapor();
frame++;
requestAnimationFrame(drawCharacter);
}
drawCharacter();
const stream = canvas.captureStream(30);
video.srcObject = stream;
btn.addEventListener('click', async () => {
try {
await video.play();
if (video.webkitSupportsPresentationMode && typeof video.webkitSetPresentationMode === "function") {
video.webkitSetPresentationMode(video.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture");
} else if (document.pictureInPictureEnabled) {
await video.requestPictureInPicture();
}
} catch (err) {
lert('Ошибка запуска окна: ' + err.message);
}
});
