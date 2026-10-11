// ============================================
// CAMERA — эффекты (зум, тряска) — заглушка
// ============================================

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.shake = 0;
  }

  update(dt) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2);
  }

  apply(ctx) {
    ctx.translate(this.x, this.y);
    ctx.scale(this.zoom, this.zoom);
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake * 10,
                    (Math.random() - 0.5) * this.shake * 10);
    }
  }
}
