const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export class Pet {
  constructor(mode, roaming) {
    this.mode = mode;
    this.roaming = roaming;
    this.time = 0;
    this.nextBlink = 3.4;
    this.happyUntil = 0;
    this.motion = 0;
    this.look = 0;
    this.tilt = 0;
    this.stride = 0;
    this.sleepBlend = 0;
    this.effectAt = -100;
    this.phase = 'day';
    this.previousPhase = 'day';
    this.phaseBlend = 1;
    this.equipped = {};
  }

  resize(width, height) {
    const previous = this.bounds;
    const maxSize = { welcome: 1.9, widget: 0.95, full: 1.78, overlay: 0.93 }[this.mode];
    this.scale = Math.min(maxSize, width / 190, height / 132);
    this.bounds = { width, height };

    if (previous) {
      this.place(this.x * width / previous.width, this.y * height / previous.height);
    } else {
      const starts = { overlay: [0.72, 0.71], welcome: [0.49, 0.61], widget: [0.5, 0.57], full: [0.5, 0.68] };
      const [x, y] = starts[this.mode];
      this.place(width * x, height * y);
    }
    this.target = null;
  }

  place(x, y) {
    const { width, height } = this.bounds;
    const side = Math.min(84 * this.scale, width / 2);
    const top = Math.min(92 * this.scale, height / 2);
    const bottom = Math.min(48 * this.scale, height / 2);
    this.x = clamp(x, side, width - side);
    this.y = clamp(y, top, height - bottom);
  }

  setRoaming(value) {
    this.roaming = value;
    this.target = null;
  }

  update(state) {
    this.sleeping = Boolean(state.sleeping);
    this.equipped = state.equipped;
    if (this.phase !== state.phase) {
      this.previousPhase = this.phase;
      this.phase = state.phase;
      this.phaseBlend = 0;
    }
    this.trip = state.trip?.id;
    if (this.sleeping) this.target = null;
    if (!state.effect) return;

    if (state.effect === 'walk') {
      this.walk();
      return;
    }
    this.effect = state.effect;
    this.effectAt = this.time;
    this.target = null;
    if (state.effect === 'celebrate') this.happyUntil = this.time + 1.05;
  }

  walk() {
    if (!this.roaming || this.held || this.sleeping || !this.bounds || this.target) return;
    const { width, height } = this.bounds;
    const left = this.x > width / 2;
    const x = width * (left ? 0.14 + Math.random() * 0.26 : 0.60 + Math.random() * 0.26);
    const y = this.mode === 'overlay' ? height * (0.14 + Math.random() * 0.7) : this.y;
    this.target = { x, y };
  }

  hold() {
    this.held = true;
    this.target = null;
  }

  drag(x, y) {
    this.tilt = clamp((x - this.x) * 0.045, -0.19, 0.19);
    this.place(x, y);
  }

  release() {
    this.held = false;
  }

  step(dt) {
    this.time += dt;
    if (this.time > this.nextBlink + 0.14) {
      this.nextBlink = this.time + 2.5 + Math.random() * 3;
    }

    this.sleepBlend += (Number(Boolean(this.sleeping)) - this.sleepBlend) * Math.min(1, dt * 3);
    this.phaseBlend = Math.min(1, this.phaseBlend + dt / 1.8);

    let walking = false;
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.hypot(dx, dy);
      const speed = this.mode === 'overlay' ? 93 : 49;
      const step = Math.min(distance, speed * dt * (0.75 + 0.25 * Math.sin(this.stride)));
      const previousX = this.x;
      const previousY = this.y;
      if (distance > 0) this.place(this.x + dx * step / distance, this.y + dy * step / distance);
      walking = Math.hypot(this.x - previousX, this.y - previousY) > 0 && distance > step;
      this.look += (Math.sign(dx) - this.look) * Math.min(1, dt * 5);
      if (!walking) this.target = null;
    } else {
      this.look *= Math.exp(-dt * 4);
    }

    this.motion += (Number(walking) - this.motion) * Math.min(1, dt * 8);
    this.stride += this.motion * dt * 12;
    this.tilt *= Math.exp(-dt * 7);
  }
}
