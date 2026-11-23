export const games = [
  { id: 'cups', name: 'Три напёрстка', description: 'Запомните, где спрятан камешек.' },
  { id: 'stars', name: 'Ловец искр', description: 'Поймайте как можно больше искр за 15 секунд.' }
];

export function startGame(id, host, onFinish) {
  const controller = new AbortController();
  const { signal } = controller;
  const timers = new Set();
  const output = document.createElement('p');
  output.className = 'game-output';
  output.setAttribute('role', 'status');
  host.replaceChildren(output);
  let finished = false;
  let pausedAt;
  let pausedTime = 0;

  function schedule(timer) {
    timer.started = performance.now();
    timer.id = setTimeout(() => {
      timers.delete(timer);
      timer.callback();
    }, timer.remaining);
  }

  function after(remaining, callback) {
    const timer = { remaining, callback };
    timers.add(timer);
    if (pausedAt === undefined) schedule(timer);
  }

  function gameTime() {
    return (pausedAt ?? performance.now()) - pausedTime;
  }

  function setPaused(paused) {
    if (finished || paused === (pausedAt !== undefined)) return;
    const now = performance.now();
    if (paused) {
      pausedAt = now;
      for (const timer of timers) {
        clearTimeout(timer.id);
        timer.remaining = Math.max(0, timer.remaining - (now - timer.started));
      }
    } else {
      pausedTime += now - pausedAt;
      pausedAt = undefined;
      for (const timer of timers) schedule(timer);
    }
    for (const animation of host.getAnimations({ subtree: true })) {
      if (paused) animation.pause();
      else animation.play();
    }
  }

  function stop() {
    controller.abort();
    for (const timer of timers) clearTimeout(timer.id);
    timers.clear();
  }

  function finish(message, reward) {
    if (finished) return;
    finished = true;
    stop();
    output.textContent = message;
    onFinish(reward);
  }

  if (id === 'cups') {
    const board = document.createElement('div');
    board.className = 'cups-board';
    const buttons = Array.from({ length: 3 }, (_, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cup';
      button.setAttribute('aria-label', 'Напёрсток ' + (i + 1));
      board.append(button);
      return button;
    });
    host.append(board);

    let round = 0;
    let found = 0;
    let answer;
    function nextRound() {
      round++;
      answer = Math.floor(Math.random() * 3);
      let swaps = round;
      for (const button of buttons) {
        button.disabled = true;
        button.dataset.revealed = String(button === buttons[answer]);
      }
      output.textContent = 'Раунд ' + round + ' из 3 · Камешек под напёрстком ' + (answer + 1);
      after(1100, shuffle);

      function shuffle() {
        for (const button of buttons) button.dataset.revealed = 'false';
        const other = (answer + 1 + Math.floor(Math.random() * 2)) % 3;
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const shift = buttons[other].offsetLeft - buttons[answer].offsetLeft;
          const exchange = (button, distance, lift) => button.animate([
            { translate: '0 0' },
            { translate: distance / 2 + 'px ' + lift + 'px' },
            { translate: distance + 'px 0' }
          ], { duration: 470, easing: 'ease-in-out' });
          exchange(buttons[answer], shift, -10);
          exchange(buttons[other], -shift, 10);
        }
        output.textContent = 'Меняются местами ' + (answer + 1) + ' и ' + (other + 1) + '…';
        answer = other;
        after(550, () => {
          if (--swaps > 0) shuffle();
          else {
            output.textContent = 'Где камешек?';
            for (const button of buttons) button.disabled = false;
            buttons[1].focus();
          }
        });
      }
    }

    for (const [i, button] of buttons.entries()) {
      button.addEventListener('click', () => {
        for (const item of buttons) item.disabled = true;
        buttons[answer].dataset.revealed = 'true';
        if (i === answer) found++;
        output.textContent = i === answer ? 'Нашёлся!' : 'Камешек был под напёрстком ' + (answer + 1) + '.';
        after(850, () => {
          if (round < 3) nextRound();
          else finish('Угадано ' + found + ' из 3.', 5 + found * 5);
        });
      }, { signal });
    }
    nextRound();
  } else {
    const board = document.createElement('div');
    board.className = 'stars-board';
    const star = document.createElement('button');
    star.className = 'game-star';
    star.type = 'button';
    star.textContent = '✦';
    star.setAttribute('aria-label', 'Поймать искру');
    board.append(star);
    host.append(board);
    let count = 0;
    let position = -1;
    const endsAt = gameTime() + 15000;

    function place() {
      position = (position + 1 + Math.floor(Math.random() * 5)) % 6;
      star.style.gridColumn = String(position % 3 + 1);
      star.style.gridRow = String(Math.floor(position / 3) + 1);
    }
    function update() {
      const remaining = Math.max(0, Math.ceil((endsAt - gameTime()) / 1000));
      if (!remaining) {
        star.disabled = true;
        finish('Искр поймано — ' + count + '.', Math.min(24, 4 + count));
        return;
      }
      output.textContent = 'Искры ' + count + ' · ' + remaining + ' с';
      after(250, update);
    }

    star.addEventListener('click', () => {
      if (gameTime() >= endsAt) return;
      count++;
      place();
    }, { signal });
    star.addEventListener('keydown', event => {
      if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault();
    }, { signal });
    place();
    star.focus();
    update();
  }
  return { stop, setPaused };
}
