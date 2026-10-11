// ============================================
// STAGE — сцена (фон + актёры)
// ============================================

import { Actor } from './actors.js';

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.background = null; // Image | color string
    this.actors = new Map();
    this._raf = null;
    this._lastTime = 0;
  }

  setBackground(bg) {
    this.background = bg;
  }

  addActor(actor) {
    if (!(actor instanceof Actor)) {
      actor = new Actor(actor);
    }
    this.actors.set(actor.id, actor);
    return actor;
  }

  removeActor(id) {
    this.actors.delete(id);
  }

  getActor(id) {
    return this.actors.get(id) || null;
  }

  start() {
    const loop = (t) => {
      const dt = (t - this._lastTime) / 1000;
      this._lastTime = t;
      this.update(dt);
      this.render();
      this._raf = requestAnimationFrame(loop);
    };
    this._lastTime = performance.now();
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  update(dt) {
    this.actors.forEach(a => a.update(dt));
  }

  render() {
    const { ctx, canvas } = this;

    // Фон
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.background instanceof HTMLImageElement) {
      ctx.drawImage(this.background, 0, 0, canvas.width, canvas.height);
    } else if (typeof this.background === 'string') {
      ctx.fillStyle = this.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Актёры (по z-order)
    const sorted = [...this.actors.values()].sort((a, b) => a.z - b.z);
    sorted.forEach(a => a.render(ctx));
  }

  destroy() {
    this.stop();
    this.actors.clear();
  }
}
