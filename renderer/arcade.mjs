import { localize, t } from './localization.mjs';
import { createScenePet } from './scene-pet.mjs';

export const arcade = [
  {
    id: 'firefly', name: 'Погоня за светлячком',
    description: 'Ведите камешек указателем или стрелками к движущемуся светлячку.',
    compactHint: 'Указатель или стрелки'
  },
  {
    id: 'pong', name: 'Пинг-понг',
    description: 'Управляйте ракеткой указателем или стрелками. Отбейте мяч десять раз.',
    compactHint: 'Указатель или стрелки'
  },
  {
    id: 'rhythm', name: 'Звёздный ритм',
    description: 'Нажимайте A, S, D или кнопки дорожек, когда звезда достигнет линии.',
    compactHint: 'A, S, D в такт звёздам'
  },
  {
    id: 'toss', name: 'Мячик для камешка',
    description: 'Щёлкните по площадке или нажмите пробел, чтобы бросить мячик.',
    compactHint: 'Щелчок или пробел для броска'
  }
];

const width = 480;
const height = 300;
const cream = '#e6d6b7';
const muted = '#817766';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function moveToward(point, target, distance) {
  const dx = target.x - point.x;
  const dy = target.y - point.y;
  const factor = Math.min(1, distance / (Math.hypot(dx, dy) || 1));
  point.x += dx * factor;
  point.y += dy * factor;
}

export function startArcade(id, host, equipped, size, onFinish) {
  const controller = new AbortController();
  const { signal } = controller;
  const surface = document.createElement('div');
  surface.className = 'arcade-surface';
  surface.dataset.arcade = id;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.tabIndex = 0;
  canvas.dataset.i18nAriaLabel = arcade.find(game => game.id === id).name;
  const output = document.createElement('p');
  output.className = 'game-output arcade-output';
  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('role', 'status');
  surface.append(canvas);
  host.replaceChildren(output, surface, live);
  const ctx = canvas.getContext('2d');
  const keys = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pet;
  let elapsed = 0;
  let score = 0;
  let done = false;
  let paused = false;
  let feedback = '';
  let feedbackUntil = 0;

  function setPrompt(text) {
    feedback = text;
    feedbackUntil = elapsed + 0.7;
    live.textContent = text ? t(text) : '';
  }

  function finish(reward) {
    if (done) return;
    done = true;
    controller.abort();
    localizeGame();
    live.textContent = output.textContent;
    onFinish(reward);
  }

  function circle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function star(x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x + 2, y - 2, x + size, y);
    ctx.quadraticCurveTo(x + 2, y + 2, x, y + size);
    ctx.quadraticCurveTo(x - 2, y + 2, x - size, y);
    ctx.quadraticCurveTo(x - 2, y - 2, x, y - size);
    ctx.fill();
  }

  function drawPet(dt, position, moving, direction) {
    const scale = surface.clientWidth / width;
    if (scale) pet.paint(dt, position.x * scale, position.y * scale, 0.51 * scale, moving, direction);
  }

  function pointer(event) {
    const { left, top, width: w, height: h } = canvas.getBoundingClientRect();
    return { x: (event.clientX - left) * width / w, y: (event.clientY - top) * height / h };
  }

  function drawGrid() {
    ctx.fillStyle = '#242424';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#34332f';
    for (let x = 14; x < width; x += 24) {
      for (let y = 18; y < height; y += 24) ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  function firefly() {
    pet = createScenePet(surface, equipped, size);
    const stone = { x: 100, y: 220 };
    const aim = { ...stone };
    const locations = [[366, 92], [113, 70], [351, 222], [230, 95], [80, 205], [396, 155]];
    canvas.addEventListener('pointermove', event => Object.assign(aim, pointer(event)), { signal });
    canvas.addEventListener('pointerdown', event => Object.assign(aim, pointer(event)), { signal });
    return {
      step(dt) {
        const dx = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
        const dy = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
        if (dx || dy) {
          aim.x = stone.x + dx * 100;
          aim.y = stone.y + dy * 100;
        }
        aim.x = clamp(aim.x, 36, width - 36);
        aim.y = clamp(aim.y, 40, height - 33);
        const [x, y] = locations[score % locations.length];
        const sweep = reduced.matches ? 0 : 22;
        const fly = { x: x + Math.cos(elapsed * 2.5) * sweep, y: y + Math.sin(elapsed * 3) * sweep };
        const direction = aim.x - stone.x;
        const moving = distance(stone, aim) > 2;
        moveToward(stone, aim, dt * 210);
        if (distance(stone, fly) < 26) {
          score++;
          pet.celebrate();
          if (score === locations.length) finish(21);
        }
        if (elapsed >= 30) finish(5 + score * 2);
        circle(fly.x, fly.y, 20, '#e6d6b720');
        circle(fly.x, fly.y, 12, '#e6d6b747');
        star(fly.x, fly.y, 7, cream);
        if (!dx && !dy && moving) circle(aim.x, aim.y, 3, muted);
        drawPet(dt, stone, moving, direction);
      },
      status: () => t('Светлячки {score}/{goal} · {seconds} с', {
        score, goal: locations.length, seconds: Math.max(0, Math.ceil(30 - elapsed))
      })
    };
  }

  function pong() {
    let paddle = width / 2;
    let lives = 3;
    let ball;
    const paddleWidth = 100;
    const paddleY = 270;

    function serve() {
      ball = { x: paddle, y: 200, vx: 100 * (lives % 2 ? 1 : -1), vy: -175 };
    }

    function aim(event) { paddle = pointer(event).x; }
    canvas.addEventListener('pointermove', aim, { signal });
    canvas.addEventListener('pointerdown', aim, { signal });
    serve();
    return {
      step(dt) {
        let remaining = dt;
        while (remaining > 0 && !done) {
          const slice = Math.min(remaining, 0.01);
          advance(slice);
          remaining -= slice;
        }
        draw();
      },
      status: () => t('Отбито {score}/10 · Попытки {lives}', { score, lives })
    };

    function advance(dt) {
      const direction = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
      paddle = clamp(paddle + direction * 380 * dt, paddleWidth / 2, width - paddleWidth / 2);
      const oldY = ball.y;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x < 9 || ball.x > width - 9) {
        ball.x = clamp(ball.x, 9, width - 9);
        ball.vx = -ball.vx;
      }
      if (ball.y < 9) {
        ball.y = 9;
        ball.vy = Math.abs(ball.vy);
      }
      if (ball.vy > 0 && oldY < paddleY - 9 && ball.y >= paddleY - 9 &&
          Math.abs(ball.x - paddle) <= paddleWidth / 2 + 8) {
        score++;
        ball.y = paddleY - 9;
        ball.vy = -(175 + score * 13);
        ball.vx = 190 * (ball.x - paddle) / (paddleWidth / 2);
        if (score === 10) finish(24);
      }
      if (ball.y >= height + 10) {
        lives--;
        if (lives) serve();
        else finish(5 + score);
      }
    }

    function draw() {
      ctx.strokeStyle = '#595344';
      ctx.setLineDash([6, 10]);
      ctx.beginPath();
      ctx.moveTo(0, 126);
      ctx.lineTo(width, 126);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = cream;
      ctx.beginPath();
      ctx.roundRect(paddle - paddleWidth / 2, paddleY, paddleWidth, 9, 4.5);
      ctx.fill();
      circle(ball.x, ball.y, 8, cream);
    }
  }

  function rhythm() {
    const letters = ['A', 'S', 'D'];
    const lanes = [0, 1, 2, 0, 2, 1, 1, 0, 2, 0, 1, 2];
    const notes = lanes.map((lane, index) => ({ lane, at: 3 + 0.85 * index, played: false }));
    const chord = document.createElement('div');
    chord.className = 'rhythm-keys';
    let flash;
    for (const [lane, letter] of letters.entries()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'text-button';
      button.textContent = letter;
      button.setAttribute('aria-keyshortcuts', letter);
      button.addEventListener('click', () => hit(lane), { signal });
      chord.append(button);
    }
    surface.after(chord);

    function hit(lane) {
      if (paused || done) return;
      const note = notes.find(note => note.lane === lane && !note.played && Math.abs(note.at - elapsed) <= 0.22);
      flash = { lane, until: elapsed + 0.25, correct: Boolean(note) };
      setPrompt(note ? 'В ритм!' : 'Мимо');
      if (note) {
        note.played = true;
        score++;
      }
    }

    return {
      key(event) {
        const lane = ['KeyA', 'KeyS', 'KeyD'].indexOf(event.code);
        if (lane < 0) return false;
        if (!event.repeat) hit(lane);
        return true;
      },
      step() {
        const hitLine = 253;
        for (let lane = 0; lane < 3; lane++) {
          const x = 80 + lane * 160;
          ctx.fillStyle = '#35342f';
          ctx.fillRect(x - 1, 20, 2, hitLine - 20);
          circle(x, hitLine, 18, flash?.lane === lane && elapsed < flash.until
            ? (flash.correct ? cream : muted) : '#534c3c');
          circle(x, hitLine, 13, '#242424');
        }
        for (const note of notes) {
          const lead = note.at - elapsed;
          if (note.played || lead > 2 || lead < -0.22) continue;
          star(80 + note.lane * 160, hitLine - lead * 115, 13, cream);
        }
        if (elapsed >= notes.at(-1).at + 0.35) finish(5 + Math.round(score * 1.5));
      },
      status: () => t('В ритм {score}/{total}', { score, total: notes.length })
    };
  }

  function toss() {
    pet = createScenePet(surface, equipped, size);
    const stone = { x: 145, y: 203 };
    const ball = { x: width / 2, y: 220, z: 0, vx: 0, vy: 0, vz: 0, mode: 'ready' };
    const tossHere = point => {
      if (paused || done || ball.mode !== 'ready') return;
      ball.x = width / 2;
      ball.y = height - 25;
      ball.z = 2;
      ball.vx = clamp(point.x - ball.x, -170, 170) * 1.4;
      ball.vy = clamp(point.y - ball.y, -135, -20) * 1.5;
      ball.vz = 190;
      ball.mode = 'outbound';
    };
    canvas.addEventListener('pointerup', event => {
      if (event.button === 0) tossHere(pointer(event));
    }, { signal });
    return {
      key(event) {
        if (event.code !== 'Space') return false;
        if (!event.repeat) tossHere({ x: score % 2 ? 95 : 380, y: 95 + score * 14 });
        return true;
      },
      step(dt) {
        const direction = ball.x - stone.x;
        const moving = ball.mode === 'outbound';
        if (ball.mode !== 'ready') {
          ball.x = clamp(ball.x + ball.vx * dt, 28, width - 28);
          ball.y = clamp(ball.y + ball.vy * dt, 55, height - 25);
          ball.z += ball.vz * dt;
          ball.vz -= 420 * dt;
          if (ball.z <= 0) {
            ball.z = 0;
            if (ball.mode === 'return') {
              ball.mode = 'ready';
              if (score === 5) finish(22);
            } else {
              ball.vz = ball.vz < -45 ? -ball.vz * 0.38 : 0;
              ball.vx *= 0.44;
              ball.vy *= 0.44;
            }
          }
        }
        if (moving) {
          moveToward(stone, ball, dt * 155);
          if (ball.z < 6 && distance(stone, ball) < 30) {
            ball.mode = 'return';
            ball.vx = (width / 2 - ball.x) * 1.2;
            ball.vy = (height - 25 - ball.y) * 1.2;
            ball.vz = 180;
            ball.z = 2;
            score++;
            pet.celebrate();
            setPrompt('Камешек отбил мячик!');
          }
        }
        circle(ball.x, ball.y + 5, 12, '#161615');
        circle(ball.x, ball.y - ball.z, 9, cream);
        circle(ball.x - 2, ball.y - ball.z - 3, 2, '#fff0cb');
        drawPet(dt, stone, moving, direction);
      },
      status: () => t('Камешек отбил мячик {score}/5', { score })
    };
  }

  const game = { firefly, pong, rhythm, toss }[id]();
  function localizeGame() {
    localize(host);
    renderStatus();
    if (feedback && elapsed < feedbackUntil) live.textContent = t(feedback);
  }

  function renderStatus() {
    const summary = game.status();
    const text = done ? t('Игра завершена. {result}', { result: summary }) : summary;
    if (output.textContent !== text) output.textContent = text;
  }

  function clearKeys() { keys.clear(); }
  host.addEventListener('keydown', event => {
    if (paused || (event.target !== canvas && event.code === 'Space')) return;
    if (game.key?.(event) || event.key.startsWith('Arrow')) {
      event.preventDefault();
      keys.add(event.key);
    }
  }, { signal });
  window.addEventListener('keyup', event => keys.delete(event.key), { signal });
  window.addEventListener('blur', clearKeys, { signal });
  canvas.addEventListener('blur', clearKeys, { signal });
  localizeGame();
  canvas.focus({ preventScroll: true });

  return {
    stop() { controller.abort(); },
    setPaused(value) {
      paused = value;
      if (paused) clearKeys();
    },
    localize: localizeGame,
    step(dt) {
      if (paused || done) return;
      elapsed += dt;
      drawGrid();
      game.step(dt);
      renderStatus();
    }
  };
}
