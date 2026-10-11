// ============================================
// MINIGAME ENGINE — базовый класс
// ============================================

export class MiniGame {
  constructor(canvas, params = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.params = params;
    this.state = 'idle'; // 'idle' | 'running' | 'win' | 'lose'
    this._raf = null;
    this._lastTime = 0;
    this.onWinCallback = null;
    this.onLoseCallback = null;
  }

  async init() {}
  update(dt) {}
  render() {}
  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  start() {
    this.state = 'running';
    this._lastTime = performance.now();
    const loop = (t) => {
      if (this.state !== 'running') return;
      const dt = Math.min((t - this._lastTime) / 1000, 0.05);
      this._lastTime = t;
      this.update(dt);
      this.render();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  onWin(cb)  { this.onWinCallback = cb; }
  onLose(cb) { this.onLoseCallback = cb; }

  win() {
    if (this.state !== 'running') return;
    this.state = 'win';
    this.onWinCallback?.();
  }

  lose() {
    if (this.state !== 'running') return;
    this.state = 'lose';
    this.onLoseCallback?.();
  }
}
