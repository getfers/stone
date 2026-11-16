const costumes = ['none', 'joker', 'batman', 'chucky', 'myers'];
const costumeNames = ['Нет', 'Джокер', 'Бэтмен', 'Чаки', 'Майерс'];
let currentCostume = 0;

function nextCostume() {
  currentCostume = (currentCostume + 1) % costumes.length;
  const btn = document.getElementById('costumeBtn');
  if (btn) btn.textContent = 'Костюм: ' + costumeNames[currentCostume];
  for (let i = 0; i < NUM_POINTS; i++) {
    nodes[i].vy -= (nodes[i].oy < 0 ? 5 : 2);
  }
}

function getBodyColor(blueRatio) {
  const costume = costumes[currentCostume];
  let baseR = 117, baseG = 121, baseB = 130;

  if (costume === 'joker') {
    baseR = 232; baseG = 234; baseB = 237;
  } else if (costume === 'batman') {
    baseR = 39; baseG = 41; baseB = 48;
  } else if (costume === 'chucky') {
    baseR = 235; baseG = 195; baseB = 165;
  } else if (costume === 'myers') {
    baseR = 238; baseG = 238; baseB = 240;
  }

  const r = Math.round(baseR + (37 - baseR) * blueRatio);
  const g = Math.round(baseG + (99 - baseG) * blueRatio);
  const b = Math.round(baseB + (235 - baseB) * blueRatio);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function drawBatmanCape(ctx, center, s, frame) {
  if (costumes[currentCostume] !== 'batman') return;
  ctx.save();
  ctx.fillStyle = '#18181b';
  ctx.strokeStyle = '#111214';
  ctx.lineWidth = Math.max(2, 4 * s);
  const capeWave = Math.sin(frame * 0.12) * 6 * s - center.vx * 2;
  ctx.beginPath();
  ctx.moveTo(center.x - 35 * s, center.y - 10 * s);
  ctx.lineTo(center.x - 62 * s + capeWave, center.y + 48 * s);
  ctx.lineTo(center.x + 62 * s + capeWave, center.y + 48 * s);
  ctx.lineTo(center.x + 35 * s, center.y - 10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCostumeDetails(ctx, center, fx, fy, s, drawLiquidBody) {
  const costume = costumes[currentCostume];
  if (costume === 'none') return;

  ctx.save();

  if (costume === 'joker') {
    ctx.fillStyle = '#16a34a';
    ctx.strokeStyle = '#111214';
    ctx.lineWidth = Math.max(2, 4 * s);
    ctx.beginPath();
    ctx.moveTo(fx - 46 * s, fy - 35 * s);
    ctx.quadraticCurveTo(fx - 54 * s, fy - 62 * s, fx - 28 * s, fy - 58 * s);
    ctx.quadraticCurveTo(fx - 10 * s, fy - 72 * s, fx + 5 * s, fy - 58 * s);
    ctx.quadraticCurveTo(fx + 32 * s, fy - 66 * s, fx + 44 * s, fy - 35 * s);
    ctx.quadraticCurveTo(fx + 15 * s, fy - 45 * s, fx - 5 * s, fy - 42 * s);
    ctx.quadraticCurveTo(fx - 25 * s, fy - 45 * s, fx - 46 * s, fy - 35 * s);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#7e22ce';
    ctx.beginPath();
    ctx.moveTo(fx - 5 * s, fy + 45 * s);
    ctx.lineTo(fx - 19 * s, fy + 38 * s);
    ctx.lineTo(fx - 19 * s, fy + 52 * s);
    ctx.closePath();
    ctx.moveTo(fx - 5 * s, fy + 45 * s);
    ctx.lineTo(fx + 9 * s, fy + 38 * s);
    ctx.lineTo(fx + 9 * s, fy + 52 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (costume === 'batman') {
    ctx.fillStyle = '#272930';
    ctx.strokeStyle = '#111214';
    ctx.lineWidth = Math.max(2.5, 5 * s);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(fx - 42 * s, fy - 38 * s);
    ctx.lineTo(fx - 36 * s, fy - 78 * s);
    ctx.lineTo(fx - 20 * s, fy - 52 * s);
    ctx.moveTo(fx + 16 * s, fy - 52 * s);
    ctx.lineTo(fx + 32 * s, fy - 78 * s);
    ctx.lineTo(fx + 38 * s, fy - 38 * s);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e5c1a3';
    ctx.beginPath();
    ctx.ellipse(fx - 4 * s, fy + 20 * s, 32 * s, 21 * s, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, 3 * s);
    ctx.stroke();
  } else if (costume === 'chucky') {
    ctx.fillStyle = '#ea580c';
    ctx.strokeStyle = '#111214';
    ctx.lineWidth = Math.max(2, 4 * s);
    ctx.beginPath();
    ctx.moveTo(fx - 48 * s, fy - 25 * s);
    ctx.quadraticCurveTo(fx - 45 * s, fy - 68 * s, fx, fy - 66 * s);
    ctx.quadraticCurveTo(fx + 45 * s, fy - 68 * s, fx + 46 * s, fy - 25 * s);
    ctx.lineTo(fx + 28 * s, fy - 42 * s);
    ctx.lineTo(fx + 14 * s, fy - 34 * s);
    ctx.lineTo(fx, fy - 44 * s);
    ctx.lineTo(fx - 18 * s, fy - 33 * s);
    ctx.lineTo(fx - 32 * s, fy - 42 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.arc(fx - 26 * s, fy + 3 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.arc(fx - 21 * s, fy + 6 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.arc(fx + 18 * s, fy + 5 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.arc(fx + 23 * s, fy + 2 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    drawLiquidBody();
    ctx.clip();
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(center.x - 75 * s, fy + 33 * s, 150 * s, 45 * s);
    ctx.fillRect(fx - 30 * s, fy + 16 * s, 10 * s, 22 * s);
    ctx.fillRect(fx + 16 * s, fy + 16 * s, 10 * s, 22 * s);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(fx - 25 * s, fy + 35 * s, 3 * s, 0, Math.PI * 2);
    ctx.arc(fx + 21 * s, fy + 35 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (costume === 'myers') {
    ctx.fillStyle = '#451a03';
    ctx.strokeStyle = '#111214';
    ctx.lineWidth = Math.max(2, 4 * s);
    ctx.beginPath();
    ctx.moveTo(fx - 46 * s, fy - 24 * s);
    ctx.quadraticCurveTo(fx - 42 * s, fy - 66 * s, fx, fy - 64 * s);
    ctx.quadraticCurveTo(fx + 42 * s, fy - 66 * s, fx + 44 * s, fy - 24 * s);
    ctx.quadraticCurveTo(fx + 20 * s, fy - 46 * s, fx, fy - 44 * s);
    ctx.quadraticCurveTo(fx - 20 * s, fy - 46 * s, fx - 46 * s, fy - 24 * s);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    drawLiquidBody();
    ctx.clip();
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(center.x - 75 * s, fy + 38 * s, 150 * s, 40 * s);
    ctx.restore();
  }

  ctx.restore();
}
