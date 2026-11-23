export function createFrameLoop(paint) {
  let fps = 30;
  let running = false;
  let timer;
  let previous;
  let deadline;

  function frame() {
    const now = performance.now();
    const elapsed = previous === undefined ? 0 : Math.min((now - previous) / 1000, 0.15);
    previous = now;
    paint(elapsed, now);
    if (!running) return;
    const interval = 1000 / fps;
    deadline += interval;
    if (deadline <= now) deadline = now + interval;
    timer = setTimeout(frame, Math.max(0, Math.ceil(deadline - performance.now())));
  }

  return {
    setFps(value) {
      if (fps === value) return;
      fps = value;
      if (running) {
        clearTimeout(timer);
        deadline = performance.now() + 1000 / fps;
        timer = setTimeout(frame, 1000 / fps);
      }
    },
    setRunning(value) {
      if (running === value) return;
      running = value;
      clearTimeout(timer);
      previous = undefined;
      if (running) {
        deadline = performance.now();
        frame();
      }
    }
  };
}
