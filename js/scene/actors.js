// ============================================
// ACTORS — персонажи на сцене
// ============================================

export class Actor {
  constructor(config = {}) {
    this.id        = config.id || 'actor_' + Math.random().toString(36).slice(2);
    this.sprite    = config.sprite || null;    // Image | Avatar | dataURL
    this.x         = config.x || 0;
    this.y         = config.y || 0;
    this.scale     = config.scale || 1;
    this.z         = config.z || 0;
    this.animation = config.animation || null; // 'walk' | 'fly' | 'wave'
    this._animTime = 0;
    this._animFrame = 0;
  }

  update(dt) {
    if (this.animation) {
      this._animTime += dt;
      this._animFrame = Math.floor(this._animTime * 8) % 4;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    // Лёгкая анимация "дыхания"
    let bounce = 0;
    if (this.animation === 'walk') {
      bounce = Math.sin(this._animTime * 10) * 2;
    } else if (this.animation === 'fly') {
      bounce = Math.sin(this._animTime * 6) * 4;
    }

    if (this.sprite && this.sprite.render) {
      // Avatar
      this.sprite.render(ctx, 0, bounce, 1);
    } else if (this.sprite instanceof HTMLImageElement) {
      ctx.drawImage(this.sprite, -this.sprite.width / 2, -this.sprite.height / 2 + bounce);
    } else if (typeof this.sprite === 'string') {
      // Строка — цвет / emoji
      ctx.font = '48px serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.sprite, 0, bounce);
    }

    ctx.restore();
  }
}
