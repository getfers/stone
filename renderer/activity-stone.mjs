export const bodyColor = '#eeeeeb';

// Объемная 3D-светотень и глубокие глазницы внутри тела
export function drawGlossy3DBody(ctx, center, fx, fy, s, drawLiquidBody) {
  ctx.save();
  drawLiquidBody();
  ctx.clip();

  // Объемный градиент для эффекта гладкого матового пластика/керамики
  const grad = ctx.createRadialGradient(
    center.x - 20 * s,
    center.y - 28 * s,
    8 * s,
    center.x,
    center.y,
    78 * s,
  );
  grad.addColorStop(0, '#ffffffdc');
  grad.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(1, '#45454565');
  ctx.fillStyle = grad;
  ctx.fillRect(center.x - 100 * s, center.y - 100 * s, 200 * s, 200 * s);

  ctx.strokeStyle = '#ffffff40';
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(center.x - 65 * s, center.y - 22 * s);
  ctx.bezierCurveTo(
    center.x - 26 * s, center.y + 4 * s,
    center.x + 15 * s, center.y - 38 * s,
    center.x + 67 * s, center.y - 11 * s
  );
  ctx.stroke();

  // Мягкие углубления (глазницы), как на картинке
  const leftSocket = ctx.createRadialGradient(
    fx - 19 * s,
    fy - 4 * s,
    8 * s,
    fx - 19 * s,
    fy - 4 * s,
    25 * s,
  );
  leftSocket.addColorStop(0, 'rgba(15, 17, 22, 0.35)');
  leftSocket.addColorStop(0.75, 'rgba(15, 17, 22, 0.12)');
  leftSocket.addColorStop(1, 'rgba(15, 17, 22, 0)');
  ctx.fillStyle = leftSocket;
  ctx.beginPath();
  ctx.arc(fx - 19 * s, fy - 4 * s, 25 * s, 0, Math.PI * 2);
  ctx.fill();

  const rightSocket = ctx.createRadialGradient(
    fx + 19 * s,
    fy - 4 * s,
    8 * s,
    fx + 19 * s,
    fy - 4 * s,
    25 * s,
  );
  rightSocket.addColorStop(0, 'rgba(15, 17, 22, 0.35)');
  rightSocket.addColorStop(0.75, 'rgba(15, 17, 22, 0.12)');
  rightSocket.addColorStop(1, 'rgba(15, 17, 22, 0)');
  ctx.fillStyle = rightSocket;
  ctx.beginPath();
  ctx.arc(fx + 19 * s, fy - 4 * s, 25 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Большие глянцевые черные глаза со стеклянным бликом
export function drawGlossyEyes(
  ctx,
  fx,
  fy,
  s,
  lookX,
  pupilOffsetY,
  leftClosed,
  rightClosed,
) {
  const eyePositions = [
    { x: fx - 19 * s, y: fy - 4 * s, closed: leftClosed },
    { x: fx + 19 * s, y: fy - 4 * s, closed: rightClosed },
  ];

  for (let eye of eyePositions) {
    ctx.save();
    const rx = 16.5 * s;
    const ry = (eye.closed ? 2.5 : 17.5) * s;

    // Светлый ободок вокруг глазницы
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = Math.max(1.5, 2.5 * s);
    ctx.beginPath();
    ctx.ellipse(
      eye.x,
      eye.y + 1.5 * s,
      rx + 1.5 * s,
      ry + 1.5 * s,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    // Глубокий черный глянцевый шар глаза
    const eyeGrad = ctx.createRadialGradient(
      eye.x - 4 * s + lookX * 0.25,
      eye.y - 5 * s + pupilOffsetY * s,
      2 * s,
      eye.x,
      eye.y,
      rx,
    );
    eyeGrad.addColorStop(0, '#27272a');
    eyeGrad.addColorStop(0.5, '#09090b');
    eyeGrad.addColorStop(1, '#000000');

    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!eye.closed) {
      // Верхний полупрозрачный стеклянный блик (как на фото)
      const gloss = ctx.createLinearGradient(eye.x, eye.y - ry, eye.x, eye.y);
      gloss.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
      gloss.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
      ctx.fillStyle = gloss;
      ctx.beginPath();
      ctx.ellipse(
        eye.x - 2 * s + lookX * 0.2,
        eye.y - 6.5 * s + pupilOffsetY * 0.5 * s,
        10.5 * s,
        6.5 * s,
        -0.25,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Яркая точечная искра блика
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(
        eye.x - 6 * s + lookX * 0.2,
        eye.y - 7 * s + pupilOffsetY * 0.5 * s,
        2.5 * s,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.restore();
  }
}
