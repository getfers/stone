export function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function rounded(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export function bottle(ctx, x, y, angle = 0, scale = 1, level = 0.78, open = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(-6, -22);
  ctx.lineTo(6, -22);
  ctx.lineTo(6, -16);
  ctx.quadraticCurveTo(13, -11, 13, -6);
  ctx.lineTo(13, 17);
  ctx.quadraticCurveTo(13, 23, 7, 23);
  ctx.lineTo(-7, 23);
  ctx.quadraticCurveTo(-13, 23, -13, 17);
  ctx.lineTo(-13, -6);
  ctx.quadraticCurveTo(-13, -11, -6, -16);
  ctx.closePath();
  ctx.fillStyle = '#e2f9fe';
  ctx.fill();
  ctx.strokeStyle = '#438cae';
  ctx.stroke();
  ctx.save();
  ctx.clip();
  const water = ctx.createLinearGradient(-12, 0, 12, 0);
  water.addColorStop(0, '#a5f0f5');
  water.addColorStop(1, '#479dd6');
  const surface = 21 - 40 * level;
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.moveTo(-14, surface);
  ctx.quadraticCurveTo(-6, surface - 3, 1, surface);
  ctx.quadraticCurveTo(9, surface + 3, 14, surface);
  ctx.lineTo(14, 24);
  ctx.lineTo(-14, 24);
  ctx.fill();
  ctx.restore();
  rounded(ctx, -10, -3, 20, 14, 4, '#f5fbffdd');
  ctx.fillStyle = '#4399bb';
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.bezierCurveTo(9, 9, -9, 9, 0, -1);
  ctx.fill();
  rounded(ctx, -10, -10, 2.4, 27, 1.2, '#ffffffa8');
  if (!open) rounded(ctx, -7, -25, 14, 6, 2, '#76c5e6', '#438cae');
  ctx.restore();
}

export function roll(ctx, x, y, scale = 1, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.lineWidth = 1.4;
  rounded(ctx, -15, -7, 30, 18, 8, '#584547', '#302a29');
  rounded(ctx, -15, -12, 30, 17, 8, '#86614f', '#302a29');
  rounded(ctx, -12, -10, 24, 13, 6, '#fff1df');
  ellipse(ctx, 0, -3.5, 6, 3.8, '#e27e81');
  ellipse(ctx, -3, -4.5, 2.7, 2, '#6eae97');
  ellipse(ctx, 4, -2, 1.7, 1.1, '#ffbda3');
  ctx.restore();
}

export function garment(ctx, id, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.3;
  if (id === 'cap' || id === 'leaf') {
    const leaf = id === 'leaf';
    const color = ctx.createLinearGradient(0, -28, 0, 13);
    color.addColorStop(0, leaf ? '#c0df89' : '#c2f4dc');
    color.addColorStop(1, leaf ? '#587347' : '#669e98');
    ctx.strokeStyle = leaf ? '#4b623d' : '#466e75';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-31, 4);
    ctx.bezierCurveTo(-32, -28, -6, -37, 13, -26);
    ctx.quadraticCurveTo(31, -18, 32, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    rounded(ctx, -33, -2, 67, 12, 6, leaf ? '#829c53' : '#90cbb9', ctx.strokeStyle);
    ellipse(ctx, leaf ? 13 : -8, -29, 8, 6, leaf ? '#dfd694' : '#d8fae4');
  } else if (id === 'glasses') {
    ctx.strokeStyle = '#41464a';
    for (const left of [-40, 5]) {
      rounded(ctx, left, -13, 35, 28, 13, '#cee0db32', '#41464a');
      ctx.beginPath();
      ctx.moveTo(left + 6, -4);
      ctx.lineTo(left + 12, -8);
      ctx.strokeStyle = '#f8f7ec9e';
      ctx.stroke();
    }
    ctx.strokeStyle = '#41464a';
    ctx.beginPath();
    ctx.moveTo(-5, -1);
    ctx.quadraticCurveTo(0, -7, 5, -1);
    ctx.stroke();
  } else if (id === 'scarf') {
    ctx.fillStyle = '#a5504d';
    ctx.strokeStyle = '#6b3734';
    ctx.beginPath();
    ctx.moveTo(-53, -10);
    ctx.quadraticCurveTo(-5, 12, 49, -10);
    ctx.lineTo(45, 4);
    ctx.quadraticCurveTo(18, 20, -46, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    rounded(ctx, 23, 0, 14, 19, 4, '#cf7467', '#6b3734');
  } else if (id === 'bow') {
    ctx.strokeStyle = '#92475f';
    ctx.fillStyle = '#ef9da8';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-24, -21, -24, -7);
    ctx.lineTo(-23, 9);
    ctx.quadraticCurveTo(-20, 18, 0, 2);
    ctx.quadraticCurveTo(23, 18, 23, 8);
    ctx.lineTo(24, -9);
    ctx.quadraticCurveTo(23, -21, 0, 0);
    ctx.fill();
    ctx.stroke();
    rounded(ctx, -6, -6, 12, 12, 4, '#f7c0c1', '#92475f');
    ctx.strokeStyle = '#ffdcce';
    ctx.beginPath();
    ctx.moveTo(-20, -5); ctx.lineTo(-8, 5);
    ctx.moveTo(20, -5); ctx.lineTo(8, 5);
    ctx.stroke();
  } else if (id === 'shell') {
    ctx.strokeStyle = '#ad706f';
    ctx.fillStyle = '#ffd0b5';
    ctx.beginPath();
    ctx.moveTo(0, 12);
    for (const [a, b, c, d] of [[-21, 2, -13, -6], [-14, -16, -6, -12], [0, -20, 6, -12], [14, -16, 13, -6], [21, 2, 0, 12]]) {
      ctx.quadraticCurveTo(a, b, c, d);
    }
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1;
    for (const end of [-9, -4, 4, 9]) {
      ctx.beginPath();
      ctx.moveTo(0, 9);
      ctx.quadraticCurveTo(end * 0.8, 0, end, -8);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function ball(ctx, x, y, radius) {
  const fill = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, radius);
  fill.addColorStop(0, '#fff0c2');
  fill.addColorStop(0.45, '#eeb67e');
  fill.addColorStop(1, '#a75e4b');
  ellipse(ctx, x, y, radius, radius, fill);
  ctx.strokeStyle = '#ffeedcaa';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, radius * 0.45, radius * 0.95, -0.6, 0, Math.PI * 2);
  ctx.stroke();
}

export function paintIcon(canvas, id) {
  const ctx = canvas.getContext('2d');
  if (id === 'water') bottle(ctx, 20, 20, -0.14, 0.66);
  else if (id === 'food') roll(ctx, 20, 21, 0.94, -0.22);
  else if (id === 'steam') {
    for (const [x, y, r] of [[13, 24, 7], [24, 24, 9], [20, 17, 7], [29, 15, 5]]) {
      ellipse(ctx, x, y, r, r * 0.85, '#eef3f8');
    }
    ellipse(ctx, 10, 13, 3, 3, '#bfcfe4');
  } else if (id === 'clean') {
    ellipse(ctx, 20, 20, 12, 12, '#a3d5ff');
    ellipse(ctx, 17, 16, 5, 4, '#e8fbff');
    ellipse(ctx, 28, 10, 4, 4, '#e8fbff');
  } else if (id === 'play') ball(ctx, 20, 20, 13);
  else garment(ctx, id, 20, id === 'cap' || id === 'leaf' ? 25 : 20, 0.43);
}

function terrain(ctx, points, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-12, 185);
  for (const [x, y, endX, endY] of points) ctx.quadraticCurveTo(x, y, endX, endY);
  ctx.lineTo(460, 260);
  ctx.lineTo(-12, 260);
  ctx.fill();
}

function pine(ctx, x, y, scale, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  rounded(ctx, -3, -9, 6, 18, 2, '#826765');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, -68);
  ctx.lineTo(20, -37); ctx.lineTo(12, -39); ctx.lineTo(25, -23);
  ctx.lineTo(17, -23); ctx.lineTo(30, -6);
  ctx.quadraticCurveTo(0, 4, -30, -6);
  ctx.lineTo(-17, -23); ctx.lineTo(-25, -23); ctx.lineTo(-12, -39);
  ctx.lineTo(-20, -37);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function picnicCloth(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.transform(1, 0.11, -0.7, 0.52, 0, 0);
  ctx.beginPath();
  ctx.roundRect(-57, -21, 114, 42, 6);
  ctx.fillStyle = '#b7977b';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#853e3499';
  for (let n = -60; n < 60; n += 16) ctx.fillRect(n, -22, 8, 44);
  for (let n = -22; n < 22; n += 16) ctx.fillRect(-58, n, 116, 8);
  ctx.restore();
}

export function landscape(ctx, scene) {
  if (scene === 'studio') {
    terrain(ctx, [[200, 221, 450, 177]], '#35332f');
    rounded(ctx, 293, 36, 75, 111, 33, '#bcb7a74d', '#b5ae9762');
    rounded(ctx, 302, 45, 57, 92, 25, '#202426');
    ctx.fillStyle = '#8b8b7b72';
    ctx.fillRect(327, 46, 4, 91);
    ctx.fillRect(303, 95, 56, 4);
    ellipse(ctx, 213, 210, 131, 32, '#54504876');
    ellipse(ctx, 213, 210, 112, 25, '#79736342');
    rounded(ctx, 52, 151, 42, 42, 8, '#695748');
    for (const [x, y, radius] of [[59, 133, 17], [79, 131, 14], [72, 116, 13]]) {
      ellipse(ctx, x, y, radius, radius * 1.35, '#677263');
    }
  } else if (scene === 'beach') {
    terrain(ctx, [[150, 106, 460, 168]], '#43585b');
    terrain(ctx, [[175, 203, 460, 150]], '#899892');
    terrain(ctx, [[175, 211, 460, 160]], '#61594d');
    for (const [x, y] of [[56, 208], [351, 215], [373, 198]]) garment(ctx, 'shell', x, y, 0.54);
  } else {
    terrain(ctx, [[90, 113, 226, 149], [350, 82, 460, 151]], scene === 'meadow' ? '#343937' : '#3b4641');
    terrain(ctx, [[99, 149, 247, 175], [340, 125, 460, 183]], scene === 'meadow' ? '#292e2c' : '#313c36');
    terrain(ctx, [[189, 230, 460, 177]], scene === 'meadow' ? '#222625' : '#2d3730');
    if (scene === 'forest') {
      for (const [x, y, size] of [[28, 174, 1.2], [89, 184, 1.55], [144, 167, 0.8], [315, 154, 0.78], [363, 181, 1.42], [418, 189, 1.7]]) {
        pine(ctx, x, y, size, x % 2 === 0 ? '#334943' : '#425b50');
      }
    } else if (scene === 'picnic') {
      picnicCloth(ctx, 113, 194, 1.15);
      picnicCloth(ctx, 342, 215, 0.64);
    } else if (scene === 'garden') {
      for (const [x, y] of [[40, 191], [74, 205], [112, 184], [332, 172], [370, 194], [412, 184]]) {
        rounded(ctx, x - 1, y - 4, 2, 15, 1, '#647261');
        ellipse(ctx, x, y - 7, 6, 6, '#ad8672');
        ellipse(ctx, x + 1, y - 8, 2, 2, '#ffe0ac');
      }
    } else {
      for (const [x, y] of [[32, 183], [61, 197], [117, 195], [339, 178], [392, 188], [419, 211]]) {
        rounded(ctx, x, y, 2, 9, 1, '#435048');
        ellipse(ctx, x + 1, y - 5, 3, 7, '#57675d');
      }
    }
  }
}
