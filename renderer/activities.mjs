import {
  getBodyColor,
  drawGlossy3DBody,
  drawGlossyEyes,
} from './activity-stone.mjs';

export const activities = [
  { id: 'sushi', label: 'Роллы' },
  {
    id: 'catch',
    label: 'Ловить роллы',
    hint: 'Управляйте стрелками или перетаскивайте камешек',
  },
  { id: 'blocks', label: 'Кубики' },
  { id: 'slide', label: 'Горка' },
  { id: 'bulb', label: 'Лампочка' },
  { id: 'drink', label: 'Выпить' },
  { id: 'vape', label: 'Попарить' },
];

export function createActivities(canvas) {
  const ctx = canvas.getContext('2d');
  const keys = new Set();
  const emotions = ['classic', 'happy', 'sad', 'surprised'];
  const NUM_POINTS = 16;
  const STIFFNESS = 0.075;
  const NEIGHBOR_PULL = 0.14;
  const DAMPING = 0.87;
  const MARGIN = 6;
  const center = { x: 240, y: 201, vx: 0, vy: 0 };
  let nodes = [];
  let drag = null;
  let currentEmotion = 0;
  let frame = 0;
  let elapsed = 0;

  const vape = { active: false, timer: 0, duration: 210, blueLevel: 0 };
  const vaporParticles = [];

  const life = { state: 'alive', timer: 0, scale: 1, ghostY: 0, ghostAlpha: 0 };
  const bulbScene = {
    active: false,
    timer: 0,
    ladderVisible: false,
    bulbState: 'none',
    shards: [],
    flashAlpha: 0,
  };
  const blocksScene = {
    active: false,
    timer: 0,
    phase: 'falling',
    currentIdx: 0,
    blocks: [],
    shapeType: 0,
  };
  const slideScene = {
    active: false,
    phase: 'approach',
    timer: 0,
    progress: 0,
    speed: 0,
  };
  const drinkScene = { active: false, timer: 0, duration: 190 };

  const sushiScene = { active: false, timer: 0, duration: 175, eaten: false };
  const sushiGame = {
    active: false,
    rolls: [],
    caught: 0,
    total: 5,
    winTimer: 0,
  };

  function isAnySceneActive() {
    return (
      Object.values(scenes).some((scene) => scene.active) ||
      life.state !== 'alive'
    );
  }

  function initNodes(customScale) {
    const s = customScale;
    nodes = [];
    for (let i = 0; i < NUM_POINTS; i++) {
      const angle = (i / NUM_POINTS) * Math.PI * 2;
      let baseR = 62 * s;
      if (Math.sin(angle) > 0) baseR += Math.sin(angle) * 6 * s;
      const ox = Math.cos(angle) * baseR;
      const oy = Math.sin(angle) * (baseR * 0.96);
      nodes.push({ ox, oy, x: center.x + ox, y: center.y + oy, vx: 0, vy: 0 });
    }
  }

  function updateNodeScale(s) {
    for (let i = 0; i < NUM_POINTS; i++) {
      const angle = (i / NUM_POINTS) * Math.PI * 2;
      let baseR = 62 * s;
      if (Math.sin(angle) > 0) baseR += Math.sin(angle) * 6 * s;
      nodes[i].ox = Math.cos(angle) * baseR;
      nodes[i].oy = Math.sin(angle) * (baseR * 0.96);
    }
  }

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

  function updateLiquidPhysics(horizontal, vertical) {
    let sumX = 0,
      sumY = 0,
      sumVx = 0,
      sumVy = 0;
    for (let i = 0; i < NUM_POINTS; i++) {
      sumX += nodes[i].x;
      sumY += nodes[i].y;
      sumVx += nodes[i].vx;
      sumVy += nodes[i].vy;
    }
    center.x = sumX / NUM_POINTS;
    center.y = sumY / NUM_POINTS;
    center.vx = sumVx / NUM_POINTS;
    center.vy = sumVy / NUM_POINTS;

    if (isNaN(center.x) || isNaN(center.y)) {
      center.x = 240;
      center.y = 155;
      initNodes(life.scale);
      return;
    }

    const disableGravity =
      drag ||
      (bulbScene.active && bulbScene.timer <= 225) ||
      (slideScene.active && slideScene.phase !== 'landed');

    for (let i = 0; i < NUM_POINTS; i++) {
      let n = nodes[i];
      let prev = nodes[(i - 1 + NUM_POINTS) % NUM_POINTS];
      let next = nodes[(i + 1) % NUM_POINTS];

      if (!disableGravity) {
        n.vx += horizontal;
        n.vy += vertical;
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
        n.y = canvas.height - MARGIN;
        n.vy = -n.vy * 0.25;
        n.vx *=
          sushiGame.active || blocksScene.active || slideScene.active
            ? 0.94
            : 0.82;
      }
      if (n.y < MARGIN) {
        n.y = MARGIN;
        n.vy = -n.vy * 0.45;
      }
      if (n.x > canvas.width - MARGIN) {
        n.x = canvas.width - MARGIN;
        n.vx = -n.vx * 0.45;
        n.vy *= 0.85;
      }
      if (n.x < MARGIN) {
        n.x = MARGIN;
        n.vx = -n.vx * 0.45;
        n.vy *= 0.85;
      }
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

  function startVape() {
    if (isAnySceneActive()) return;

    vape.active = true;
    vape.timer = 0;
  }

  function triggerDeath() {
    vape.active = false;

    bulbScene.active = false;
    blocksScene.active = false;
    slideScene.active = false;

    drinkScene.active = false;
    sushiScene.active = false;
    sushiGame.active = false;
    drag = null;
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
  }

  function startBulbScene() {
    if (isAnySceneActive()) return;

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
      targets = [
        { x: 240, y: floorY },
        { x: 240, y: floorY - size },
        { x: 240, y: floorY - size * 2 },
        { x: 240, y: floorY - size * 3 },
      ];
    } else if (blocksScene.shapeType === 1) {
      targets = [
        { x: 240 - size, y: floorY },
        { x: 240, y: floorY },
        { x: 240 + size, y: floorY },
        { x: 240, y: floorY - size },
      ];
    } else {
      targets = [
        { x: 240 - size, y: floorY },
        { x: 240 + size, y: floorY },
        { x: 240 - size * 0.5, y: floorY - size },
        { x: 240 + size * 0.5, y: floorY - size },
      ];
    }

    blocksScene.blocks = [];
    for (let i = 0; i < 4; i++) {
      let rx =
        i % 2 === 0 ? 45 + Math.random() * 115 : 320 + Math.random() * 115;
      blocksScene.blocks.push({
        x: rx,
        y: -20 - i * 35,
        vy: 0,
        size: size,
        color: colors[i],
        tx: targets[i].x,
        ty: targets[i].y,
        placed: false,
        carried: false,
      });
    }
  }

  function startSlideScene() {
    if (isAnySceneActive()) return;

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
    }

    if (t > 75 && t < 135 && t % 12 === 0) {
      for (let i = 0; i < NUM_POINTS; i++) {
        nodes[i].vy -= nodes[i].oy < 0 ? 3.5 : 1.5;
      }
    }

    if (t >= sushiScene.duration) {
      sushiScene.active = false;
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
        caught: false,
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

      if (r.x < 22) {
        r.x = 22;
        r.vx = Math.abs(r.vx);
      }
      if (r.x > canvas.width - 22) {
        r.x = canvas.width - 22;
        r.vx = -Math.abs(r.vx);
      }
      if (r.y < 28) {
        r.y = 28;
        r.vy = Math.abs(r.vy);
      }
      if (r.y > canvas.height - 22) {
        r.y = canvas.height - 22;
        r.vy = -Math.abs(r.vy);
      }

      if (Math.hypot(r.x - center.x, r.y - center.y) < catchRadius) {
        r.caught = true;
        sushiGame.caught++;
        currentEmotion = 1;

        for (let i = 0; i < NUM_POINTS; i++) {
          nodes[i].vy -= nodes[i].oy < 0 ? 5 : 2;
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
      ctx.fillText(
        'Роллы: ' + sushiGame.caught + ' / ' + sushiGame.total,
        canvas.width / 2,
        29,
      );
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

        for (let i = 0; i < NUM_POINTS; i++) nodes[i].vx += 5.5;
      }
    } else if (slideScene.phase === 'landed') {
      if (slideScene.timer > 125) {
        slideScene.active = false;
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
    ctx.moveTo(140, 92);
    ctx.lineTo(140, 264);
    ctx.moveTo(170, 92);
    ctx.lineTo(170, 264);
    ctx.moveTo(265, 200);
    ctx.lineTo(265, 264);
    ctx.stroke();
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(95, 264);
    ctx.lineTo(140, 92);
    ctx.stroke();
    ctx.lineWidth = 3.5;
    for (let i = 1; i <= 5; i++) {
      const ratio = i / 6;
      const sx = 95 + (140 - 95) * ratio;
      const sy = 264 + (92 - 264) * ratio;
      ctx.beginPath();
      ctx.moveTo(sx - 6, sy);
      ctx.lineTo(sx + 8, sy);
      ctx.stroke();
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(138, 92);
    ctx.lineTo(168, 92);
    ctx.quadraticCurveTo(235, 225, 385, 254);
    ctx.stroke();
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(138, 90);
    ctx.lineTo(168, 90);
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

      for (let i = 0; i < NUM_POINTS; i++) {
        nodes[i].vy -= nodes[i].oy < 0 ? 7 : 3;
        nodes[i].vx += (Math.random() - 0.5) * 10;
      }
      for (let k = 0; k < 14; k++) {
        bulbScene.shards.push({
          x: 240 + (Math.random() - 0.5) * 16,
          y: 44 + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 9,
          vy: (Math.random() - 0.7) * 7,
          size: 3 + Math.random() * 4,
          alpha: 1,
        });
      }
    } else if (t > 380) {
      bulbScene.active = false;
      bulbScene.bulbState = 'none';
    }
    if (bulbScene.flashAlpha > 0)
      bulbScene.flashAlpha = Math.max(0, bulbScene.flashAlpha - 0.06);
  }
  function drawLadder() {
    if (!bulbScene.ladderVisible) return;
    ctx.save();
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(212, 264);
    ctx.lineTo(222, 105);
    ctx.moveTo(268, 264);
    ctx.lineTo(258, 105);
    ctx.stroke();
    ctx.lineWidth = 4;
    for (let y = 125; y <= 245; y += 30) {
      const ratio = (y - 105) / (264 - 105);
      const halfW = 18 + ratio * 10;
      ctx.beginPath();
      ctx.moveTo(240 - halfW, y);
      ctx.lineTo(240 + halfW, y);
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
    ctx.moveTo(240, 0);
    ctx.lineTo(240, 18);
    ctx.stroke();
    ctx.fillStyle = '#3f424a';
    ctx.strokeStyle = '#111214';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(231, 16, 18, 14, 3);
    ctx.fill();
    ctx.stroke();
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
      ctx.fill();
      ctx.stroke();
    } else if (bulbScene.bulbState === 'broken') {
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(234, 30);
      ctx.lineTo(236, 37);
      ctx.lineTo(240, 32);
      ctx.lineTo(244, 38);
      ctx.lineTo(246, 30);
      ctx.stroke();
    }
    for (let i = bulbScene.shards.length - 1; i >= 0; i--) {
      let s = bulbScene.shards[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.35;
      s.alpha -= 0.02;
      if (s.alpha <= 0) {
        bulbScene.shards.splice(i, 1);
        continue;
      }
      ctx.fillStyle = 'rgba(254, 240, 138, ' + s.alpha.toFixed(2) + ')';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    if (bulbScene.flashAlpha > 0) {
      ctx.fillStyle =
        'rgba(255, 255, 255, ' + bulbScene.flashAlpha.toFixed(2) + ')';
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
        alpha: 0.65 + Math.random() * 0.2,
      });
    }
  }
  function updateAndDrawVapor() {
    for (let i = vaporParticles.length - 1; i >= 0; i--) {
      let p = vaporParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy -= 0.012;
      p.r += 0.55;
      p.alpha -= 0.0085;
      if (p.alpha <= 0) {
        vaporParticles.splice(i, 1);
        continue;
      }
      ctx.save();
      const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r);
      grad.addColorStop(0, 'rgba(240, 244, 248, ' + p.alpha.toFixed(2) + ')');
      grad.addColorStop(
        0.5,
        'rgba(235, 240, 245, ' + (p.alpha * 0.5).toFixed(2) + ')',
      );
      grad.addColorStop(1, 'rgba(240, 244, 248, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  function drawDyingSequence() {
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
      ctx.moveTo(fx - 23, fy - 24);
      ctx.lineTo(fx - 9, fy - 10);
      ctx.moveTo(fx - 9, fy - 24);
      ctx.lineTo(fx - 23, fy - 10);
      ctx.moveTo(fx + 3, fy - 22);
      ctx.lineTo(fx + 17, fy - 8);
      ctx.moveTo(fx + 17, fy - 22);
      ctx.lineTo(fx + 3, fy - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx - 22, fy + 18);
      ctx.lineTo(fx + 14, fy + 22);
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
      ctx.arc(
        center.x + Math.sin(life.timer * 0.1) * 8,
        life.ghostY,
        26,
        Math.PI,
        0,
      );
      ctx.lineTo(
        center.x + 26 + Math.sin(life.timer * 0.1) * 8,
        life.ghostY + 22,
      );
      ctx.lineTo(center.x + Math.sin(life.timer * 0.1) * 8, life.ghostY + 14);
      ctx.lineTo(
        center.x - 26 + Math.sin(life.timer * 0.1) * 8,
        life.ghostY + 22,
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (life.timer >= 165) triggerRebirth();
  }
  function startDrinkScene() {
    if (isAnySceneActive()) return;

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

      for (let i = 0; i < NUM_POINTS; i++) {
        nodes[i].vy -= nodes[i].oy < 0 ? 5 : 2;
      }
    }
    if (t >= drinkScene.duration) {
      drinkScene.active = false;
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
      liquidLevel,
    );
  }

  const scenes = {
    sushi: sushiScene,
    catch: sushiGame,
    blocks: blocksScene,
    slide: slideScene,
    bulb: bulbScene,
    drink: drinkScene,
    vape,
  };
  const begin = {
    sushi: startSushiScene,
    catch: startSushiGame,
    blocks: startBlocksScene,
    slide: startSlideScene,
    bulb: startBulbScene,
    drink: startDrinkScene,
    vape: startVape,
  };

  function resetPosition() {
    center.x = 240;
    center.y = 201;
    center.vx = 0;
    center.vy = 0;
    initNodes(life.scale);
  }

  function stop() {
    for (const scene of Object.values(scenes)) scene.active = false;
    if (life.state !== 'alive') {
      life.state = 'alive';
      life.scale = 1;
      vape.blueLevel = 0;
    }
    vaporParticles.length = 0;
    keys.clear();
    drag = null;
  }

  function update() {
    if (life.state === 'reborn') {
      life.scale = Math.min(1, life.scale + 0.0022);
      updateNodeScale(life.scale);
      if (life.scale === 1) life.state = 'alive';
    }
    if (!vape.active) vape.blueLevel = Math.max(0, vape.blueLevel - 0.0004);

    if (bulbScene.active) updateBulbScene();
    else if (blocksScene.active) updateBlocksScene();
    else if (slideScene.active) updateSlideScene();
    else if (drinkScene.active) updateDrinkScene();
    else if (sushiScene.active) updateSushiScene();
    else if (sushiGame.active) updateSushiGame();

    const horizontal = sushiGame.active
      ? (Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'))) * 0.9
      : 0;
    const vertical = sushiGame.active
      ? (Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'))) * 0.9
      : 0.42;
    if (drag) moveCharacterTo(drag.x, drag.y, 0.25);
    updateLiquidPhysics(horizontal, vertical);
    frame++;
  }

  function paint() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLadder();
    drawSlide();
    if (life.state === 'dying') {
      drawDyingSequence();
      updateAndDrawVapor();
      return;
    }
    paintStone();
    drawBlocks();
    drawBulbAndSocket();
    drawDrinkScene(center.x, center.y, life.scale);
    drawSushiScene(center.x, center.y, life.scale);
    drawSushiGame();
    updateAndDrawVapor();
  }

  function paintStone() {
    const s = life.scale;
    const shiverX = vape.blueLevel > 0.65 ? (Math.random() - 0.5) * 3 : 0;
    drawLiquidBody();
    ctx.fillStyle = getBodyColor(vape.blueLevel);
    ctx.fill();
    const lookX =
      Math.max(-11 * s, Math.min(11 * s, center.vx * 1.4)) + shiverX;
    const lookY = Math.max(-9 * s, Math.min(9 * s, center.vy * 0.65));
    const fx = center.x + lookX;
    const fy = center.y + lookY;
    drawGlossy3DBody(ctx, center, fx, fy, s, drawLiquidBody);
    const emo = emotions[currentEmotion];
    const isBlinking = frame % 170 > 162 && emo !== 'surprised';
    ctx.strokeStyle = 'rgba(24, 24, 27, 0.75)';
    ctx.lineWidth = Math.max(2.5, 4.5 * s);
    ctx.lineCap = 'round';
    if (vape.active) {
      vape.timer++;
      const isInhaling = vape.timer < 85;
      const isExhaling = vape.timer >= 85 && vape.timer < 175;
      if (isInhaling) {
        vape.blueLevel = Math.min(1.0, vape.blueLevel + 0.0038);
        if (vape.blueLevel >= 1.0) {
          triggerDeath();
          return;
        }
      }
      drawGlossyEyes(ctx, fx, fy, s, lookX, 2.5, isInhaling, false);
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(
        fx - 12 * s,
        fy + 26 * s,
        (isExhaling ? 6.5 : 4.5) * s,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      let slideOffset = 0;
      if (vape.timer < 20) slideOffset = (20 - vape.timer) * 3;
      if (vape.timer > 180) slideOffset = (vape.timer - 180) * 3;
      ctx.save();
      ctx.translate(
        fx - (30 + slideOffset) * s,
        fy + (31 + slideOffset * 0.5) * s,
      );
      ctx.rotate(-0.45);
      ctx.scale(s, s);
      ctx.fillStyle = '#2b2d33';
      ctx.strokeStyle = '#111214';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-30, -6, 32, 12, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#111214';
      ctx.fillRect(0, -4.5, 8, 9);
      ctx.fillStyle = isInhaling ? '#38bdf8' : '#525660';
      ctx.beginPath();
      ctx.arc(-22, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (isExhaling && vape.timer % 2 === 0)
        spawnVapor(fx - 15 * s, fy + 24 * s);
      if (vape.timer >= vape.duration) {
        vape.active = false;
      }
    } else {
      const bulbLookOffset =
        bulbScene.active && bulbScene.timer > 110 && bulbScene.timer < 295
          ? -4.5
          : 0;
      if (drinkScene.active) {
        const isDrinking = drinkScene.timer >= 20 && drinkScene.timer <= 155;
        drawGlossyEyes(
          ctx,
          fx,
          fy,
          s,
          lookX,
          isDrinking ? -2 : 0,
          isDrinking,
          false,
        );
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(
          fx - 10 * s,
          fy + 25 * s,
          (isDrinking ? 6.5 : 4.5) * s,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else if (sushiScene.active) {
        const isEating = sushiScene.timer >= 70 && sushiScene.timer <= 135;
        drawGlossyEyes(
          ctx,
          fx,
          fy,
          s,
          lookX,
          isEating ? -2 : 1,
          isEating,
          isEating,
        );
        if (isEating) {
          ctx.beginPath();
          ctx.arc(fx, fy + 23 * s, 12 * s, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#18181b';
          ctx.beginPath();
          ctx.arc(fx - 8 * s, fy + 25 * s, 6.5 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (emo === 'classic') {
        drawGlossyEyes(
          ctx,
          fx,
          fy,
          s,
          lookX,
          bulbLookOffset,
          isBlinking,
          isBlinking,
        );
      } else if (emo === 'happy') {
        drawGlossyEyes(
          ctx,
          fx,
          fy,
          s,
          lookX,
          -2.5 + bulbLookOffset,
          isBlinking,
          isBlinking,
        );
        ctx.beginPath();
        ctx.arc(fx, fy + 22 * s, 13 * s, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else if (emo === 'sad') {
        drawGlossyEyes(ctx, fx, fy, s, lookX, 3.5, isBlinking, isBlinking);
        ctx.beginPath();
        ctx.arc(fx, fy + 36 * s, 12 * s, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
      } else if (emo === 'surprised') {
        drawGlossyEyes(ctx, fx, fy, s, lookX, bulbLookOffset, false, false);
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.ellipse(fx, fy + 26 * s, 7 * s, 9 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function pointerPosition(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!sushiGame.active || event.button !== 0 || drag) return;
    const point = pointerPosition(event);
    if (Math.hypot(point.x - center.x, point.y - center.y) > 70) return;
    drag = { ...point, id: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (drag?.id === event.pointerId)
      Object.assign(drag, pointerPosition(event));
  });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, (event) => {
      if (drag?.id === event.pointerId) drag = null;
    });
  }

  for (const type of ['keydown', 'keyup']) {
    canvas.addEventListener(type, (event) => {
      if (!sushiGame.active || !event.key.startsWith('Arrow')) return;
      event.preventDefault();
      if (type === 'keydown') keys.add(event.key);
      else keys.delete(event.key);
    });
  }
  canvas.addEventListener('blur', () => keys.clear());
  window.addEventListener('blur', () => keys.clear());

  return {
    start(id) {
      if (isAnySceneActive()) return;
      resetPosition();
      frame = 0;
      elapsed = 0;
      currentEmotion = 0;
      begin[id]();
      paint();
    },
    step(seconds) {
      elapsed += seconds;
      const tick = 1 / 60;
      while (elapsed >= tick && isAnySceneActive()) {
        update();
        paint();
        elapsed -= tick;
      }
      return isAnySceneActive();
    },
    stop,
  };
}
