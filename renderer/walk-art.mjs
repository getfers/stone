export function paintWalk(canvas, id, stops) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.setTransform(w / 600, 0, 0, h / 440, 0, 0);

  function line(points, color, width = 1) {
    ctx.beginPath();
    points.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function fill(points, color) {
    ctx.beginPath();
    points.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function oval(x, y, rx, ry, color) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function rect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }

  function pine(x, y, height, color) {
    rect(x - 2, y - height, 4, height, '#47453e');
    for (const tier of [0.9, 0.72, 0.52]) {
      const tip = y - height * tier;
      const spread = height * (0.41 - tier * 0.23);
      fill([[x, tip - height * 0.1], [x - spread, tip + height * 0.43],
        [x, tip + height * 0.37], [x + spread, tip + height * 0.42]], color);
    }
  }

  const near = '#3d3e39';
  const far = '#30312e';
  const dusk = ctx.createLinearGradient(0, 0, 0, 440);
  dusk.addColorStop(0, '#20211f');
  dusk.addColorStop(0.65, '#36372f');
  dusk.addColorStop(1, '#262724');
  rect(0, 0, 600, 440, dusk);
  const glow = ctx.createRadialGradient(434, 80, 10, 434, 80, 195);
  glow.addColorStop(0, '#e6d6b733');
  glow.addColorStop(1, '#e6d6b700');
  rect(0, 0, 600, 440, glow);
  const moonRadius = 27 * w / h * 440 / 600;
  oval(434, 80, 27, moonRadius, '#ded1b6');
  for (let i = 0; i < 38; i++) {
    const x = (i * 197 + 23) % 600;
    const y = (i * 73 + 36) % 170;
    if (Math.hypot(x - 434, y - 80) > 38) oval(x, y, i % 5 ? 0.9 : 1.6, i % 5 ? 0.9 : 1.6, '#a79f8b');
  }

  const horizon = id === 'mountain'
    ? [[0, 240], [119, 73], [207, 163], [289, 54], [363, 149], [471, 99], [600, 204]]
    : [[0, 212], [78, 159], [152, 148], [218, 191], [302, 153], [395, 176], [509, 138], [600, 182]];
  fill([...horizon, [600, 440], [0, 440]], far);
  if (id === 'mountain') {
    line(horizon, '#56564d', 2);
    fill([[91, 112], [119, 73], [161, 116], [127, 105], [116, 115], [107, 106]], '#817d6c');
    fill([[249, 106], [289, 54], [331, 108], [300, 95], [289, 110], [277, 91]], '#918976');
    fill([[0, 315], [133, 261], [260, 286], [426, 199], [600, 178], [600, 440], [0, 440]], near);
  } else if (id === 'beach') {
    fill([[0, 194], [108, 204], [270, 183], [433, 173], [600, 199], [600, 440], [0, 440]], '#3a3d38');
    for (let i = 0; i < 38; i++) {
      const x = (i * 131) % 600;
      const y = 192 + (i * 23) % 111;
      line([[x, y], [x + 15 + i % 23, y]], i % 3 ? '#66665b' : '#83806d');
    }
    fill([[0, 260], [125, 294], [220, 322], [366, 321], [485, 300], [600, 313], [600, 440], [0, 440]], '#4b483f');
    line([[0, 258], [125, 292], [220, 320], [366, 319], [485, 298], [600, 311]], '#99917b', 2);
  } else {
    const grove = id === 'forest' ? 17 : 8;
    for (let i = 0; i < grove; i++) {
      pine((i * 83 + 16) % 620, 244 + i % 4 * 8, 29 + (i * 41) % 91, i % 3 ? '#363833' : '#41433b');
    }
    fill([[0, 266], [107, 236], [238, 257], [340, 249], [470, 231], [600, 259], [600, 440], [0, 440]], near);
  }

  const trail = new Path2D();
  trail.moveTo(-25, 421);
  if (id === 'mountain') {
    trail.bezierCurveTo(124, 337, 320, 365, 308, 292);
    trail.bezierCurveTo(296, 235, 404, 231, 522, 224);
  } else {
    trail.bezierCurveTo(141, 322, 216, 360, 316, 365);
    trail.bezierCurveTo(409, 366, 453, 302, 630, 316);
  }
  ctx.strokeStyle = '#555146';
  ctx.lineWidth = 23;
  ctx.stroke(trail);
  ctx.strokeStyle = '#6c6656';
  ctx.lineWidth = 1;
  ctx.stroke(trail);

  const objects = {
    pine(x, y) { pine(x, y + 9, 146, '#53584a'); },
    moss(x, y) {
      for (let i = 0; i < 6; i++) oval(x + i * 13 - 32, y + (i % 3) * 4, 19, 9, i % 2 ? '#5d6251' : '#4e5347');
    },
    lights(x, y) {
      for (let i = 0; i < 9; i++) {
        const px = x + (i * 17) % 79 - 36;
        const py = y + (i * 11) % 40 - 22;
        oval(px, py, 7, 7, '#e6d6b72a');
        oval(px, py, 2, 2, '#e6d6b7');
      }
    },
    bench(x, y) {
      for (const dy of [-16, -9, 2]) line([[x - 28, y + dy], [x + 28, y + dy]], '#95866c', 4);
      for (const dx of [-23, 23]) line([[x + dx, y - 18], [x + dx, y + 9]], '#696359', 3);
    },
    lamp(x, y) {
      oval(x, y - 46, 32, 33, '#e6d6b727');
      line([[x, y + 21], [x, y - 42]], '#a29982', 3);
      fill([[x - 10, y - 43], [x - 8, y - 56], [x + 8, y - 56], [x + 10, y - 43]], '#ddcda9');
    },
    flowers(x, y) {
      for (let i = 0; i < 8; i++) {
        const px = x - 30 + 9 * i;
        const py = y - (i * 7) % 19;
        line([[px, py + 14], [px, py]], '#7b8068', 2);
        oval(px, py, 4, 4, i % 3 ? '#a79b7b' : '#dac7a2');
      }
    },
    reeds(x, y) {
      for (let i = 0; i < 8; i++) {
        const px = x - 27 + i * 7;
        const py = y - (i * 13) % 37;
        line([[px + 2, y + 12], [px, py]], '#8a8971', 2);
        oval(px, py, 2.5, 6, '#b2a487');
      }
    },
    dock(x, y) {
      fill([[x - 35, y - 20], [x + 29, y - 20], [x + 51, y + 14], [x - 18, y + 14]], '#83755e');
      for (const dy of [-14, -5, 4, 13]) line([[x - 25 + dy / 2, y + dy], [x + 44 + dy / 2, y + dy]], '#514a3e', 2);
      for (const dx of [-35, 28, -18, 51]) {
        const dy = dx === -35 || dx === 28 ? -20 : 14;
        line([[x + dx, y + dy + 15], [x + dx, y + dy - 12]], '#aca082', 3);
      }
    },
    pebbles(x, y) {
      for (let i = 0; i < 7; i++) oval(x + i * 10 - 30, y + (i * 7) % 17, 6 + i % 3, 3 + i % 4, i % 2 ? '#8e8674' : '#6a6355');
    },
    cairn(x, y) {
      oval(x, y + 8, 23, 7, '#807869');
      oval(x + 2, y, 18, 6, '#98907e');
      oval(x - 3, y - 9, 11, 6, '#aca18a');
      oval(x - 4, y - 17, 6, 4, '#bfb199');
    },
    sign(x, y) {
      line([[x, y + 12], [x, y - 30]], '#81735c', 4);
      fill([[x - 22, y - 34], [x + 11, y - 34], [x + 23, y - 27],
        [x + 11, y - 20], [x - 22, y - 20]], '#ad9c7d');
    },
    lookout(x, y) {
      for (const dx of [-34, -12, 12, 34]) line([[x + dx, y - 13], [x + dx, y + 14]], '#8c8067', 3);
      line([[x - 34, y - 10], [x + 34, y - 10]], '#b4a689', 4);
      line([[x - 34, y + 1], [x + 34, y + 1]], '#8c8067', 3);
    }
  };
  for (const { id, x, y } of stops) objects[id](x * 6, y * 4.4);
}
