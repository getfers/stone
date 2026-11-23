import { t } from './localization.mjs';
import { garment, roll } from './art.mjs';
import { drawClothes, drawEyes } from './stone-art.mjs';

export const activities = [
  {
    id: 'catch',
    label: 'Ловить роллы',
    hint: 'Управляйте стрелками или перетаскивайте камешек',
  },
  { id: 'blocks', label: 'Кубики' },
  { id: 'slide', label: 'Горка' },
  { id: 'bulb', label: 'Лампочка' },
];

export function createActivities(canvas, onCatchWin, equipped) {
  const ctx = canvas.getContext('2d');
  const keys = new Set();
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
  const sushiGame = {
    active: false,
    rolls: [],
    caught: 0,
    total: 5,
    winTimer: 0,
  };

  function isAnySceneActive() {
    return Object.values(scenes).some(scene => scene.active);
  }

  function initNodes() {
    nodes = [];
    for (let i = 0; i < NUM_POINTS; i++) {
      const angle = (i / NUM_POINTS) * Math.PI * 2;
      let baseR = 62;
      if (Math.sin(angle) > 0) baseR += Math.sin(angle) * 6;
      const ox = Math.cos(angle) * baseR;
      const oy = Math.sin(angle) * (baseR * 0.96);
      nodes.push({ ox, oy, x: center.x + ox, y: center.y + oy, vx: 0, vy: 0 });
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
      initNodes();
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
    const colors = ['#d17c9d', '#83a8d8', '#dbb378', '#83b9a1'];

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

    const catchRadius = 64;

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
        if (sushiGame.caught === sushiGame.total) onCatchWin();
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
        roll(ctx, r.x, r.y, 1.1, r.angle);
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
      ctx.fillText(t('ВСЕ РОЛЛЫ ПОЙМАНЫ!'), canvas.width / 2, 29);
    } else {
      ctx.fillText(
        t('Роллы: {caught} / {total}', sushiGame),
        canvas.width / 2,
        29,
      );
    }
    ctx.restore();
  }

  function updateSlideScene() {
    slideScene.timer++;
    const s = 1;
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
    ctx.strokeStyle = '#7b6d60';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(140, 92);
    ctx.lineTo(140, 264);
    ctx.moveTo(170, 92);
    ctx.lineTo(170, 264);
    ctx.moveTo(265, 200);
    ctx.lineTo(265, 264);
    ctx.stroke();
    ctx.strokeStyle = '#dfae9d';
    ctx.lineWidth = 7;
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
    const chute = ctx.createLinearGradient(0, 90, 0, 255);
    chute.addColorStop(0, '#c2edd7');
    chute.addColorStop(1, '#80b6b9');
    ctx.strokeStyle = '#54798c';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(138, 92);
    ctx.lineTo(168, 92);
    ctx.quadraticCurveTo(235, 225, 385, 254);
    ctx.stroke();
    ctx.strokeStyle = chute;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.strokeStyle = '#f2ffeb';
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
      b.y = center.y - 68;
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
      const enamel = ctx.createLinearGradient(b.x - hs, b.y - hs, b.x + hs, b.y + hs);
      enamel.addColorStop(0, '#ffe7e0');
      enamel.addColorStop(0.39, b.color);
      enamel.addColorStop(1, '#565b50');
      ctx.fillStyle = enamel;
      ctx.strokeStyle = '#454741';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(b.x - hs, b.y - hs, b.size, b.size, 5);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#fff1df83';
      ctx.beginPath();
      ctx.roundRect(b.x - hs + 3, b.y - hs + 3, b.size - 6, b.size - 6, 3);
      ctx.stroke();
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
    for (let i = bulbScene.shards.length - 1; i >= 0; i--) {
      const shard = bulbScene.shards[i];
      shard.x += shard.vx;
      shard.y += shard.vy;
      shard.vy += 0.35;
      shard.alpha -= 0.02;
      if (shard.alpha <= 0) bulbScene.shards.splice(i, 1);
    }
  }
  function drawLadder() {
    if (!bulbScene.active || !bulbScene.ladderVisible) return;
    ctx.save();
    ctx.strokeStyle = '#d59c86';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(212, 264);
    ctx.lineTo(222, 105);
    ctx.moveTo(268, 264);
    ctx.lineTo(258, 105);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#f3be9a';
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
    ctx.fillStyle = '#756958';
    ctx.strokeStyle = '#40392f';
    ctx.lineWidth = 2;
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
      const glass = ctx.createRadialGradient(235, 40, 1, 240, 43, 19);
      glass.addColorStop(0, '#fff8df');
      glass.addColorStop(1, isLit ? '#efbd63' : '#dde1d895');
      ctx.fillStyle = glass;
      ctx.strokeStyle = isLit ? '#ffe7af' : '#d9ded5';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(234, 28);
      ctx.bezierCurveTo(228, 35, 222, 39, 227, 49);
      ctx.bezierCurveTo(232, 59, 248, 59, 253, 49);
      ctx.bezierCurveTo(258, 39, 252, 35, 246, 28);
      ctx.closePath();
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
    for (const shard of bulbScene.shards) {
      ctx.fillStyle = 'rgba(254, 240, 138, ' + shard.alpha.toFixed(2) + ')';
      ctx.fillRect(shard.x, shard.y, shard.size, shard.size);
    }
    if (bulbScene.flashAlpha > 0) {
      ctx.fillStyle =
        'rgba(255, 255, 255, ' + bulbScene.flashAlpha.toFixed(2) + ')';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }
  const scenes = {
    catch: sushiGame,
    blocks: blocksScene,
    slide: slideScene,
    bulb: bulbScene,
  };
  const begin = {
    catch: startSushiGame,
    blocks: startBlocksScene,
    slide: startSlideScene,
    bulb: startBulbScene,
  };

  function resetPosition() {
    center.x = 240;
    center.y = 201;
    center.vx = 0;
    center.vy = 0;
    initNodes();
  }

  canvas.addEventListener('blur', () => keys.clear());

  function stop() {
    for (const scene of Object.values(scenes)) scene.active = false;
    keys.clear();
    drag = null;
  }

  function update() {
    if (bulbScene.active) updateBulbScene();
    else if (blocksScene.active) updateBlocksScene();
    else if (slideScene.active) updateSlideScene();
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
    paintStone();
    drawBlocks();
    drawBulbAndSocket();
    drawSushiGame();
  }

  function paintStone() {
    const clothes = equipped();
    if (clothes.outfit === 'cape') garment(ctx, 'cape', center.x, center.y + 31 * 0.93, 0.93);
    drawLiquidBody();
    ctx.fillStyle = '#f1f1ed';
    ctx.fill();
    ctx.strokeStyle = '#aaa9a3';
    ctx.lineWidth = 1;
    ctx.stroke();
    const lookX = Math.max(-11, Math.min(11, center.vx * 1.4));
    const lookY = Math.max(-9, Math.min(9, center.vy * 0.65));
    const bulbLook = bulbScene.active && bulbScene.timer > 110 && bulbScene.timer < 295 ? -4.5 : 0;
    const emotionLook = currentEmotion === 1 ? -2.5 : currentEmotion === 2 ? 3.5 : 0;
    const eyeY = lookY + bulbLook + emotionLook - 4;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.scale(0.93, 0.93);
    drawEyes(ctx, lookX, eyeY, {
      joy: currentEmotion === 1 ? 1 : 0,
      blink: frame % 170 > 162 && currentEmotion !== 3,
      held: currentEmotion === 3
    });
    drawClothes(ctx, clothes, lookX, eyeY);
    ctx.restore();
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
        elapsed -= tick;
      }
      paint();
      return isAnySceneActive();
    },
    stop,
  };
}
