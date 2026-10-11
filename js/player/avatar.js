// ============================================
// AVATAR — персонаж (стикман СЕЙЧАС → фото ПОТОМ)
// ============================================

export class Avatar {
  constructor(config = {}) {
    // Интерфейс НЕ меняется, когда добавим фото
    this.body  = config.body  || 'stickman';   // 'stickman' | 'boy' | 'girl'
    this.head  = config.head  || null;          // null СЕЙЧАС → DataURL ПОТОМ
    this.color = config.color || '#3a2e1f';
    this.scale = config.scale || 1;
  }

  // Рисует аватара в (x, y) — центр фигуры
  render(ctx, x, y, scale = 1) {
    const s = scale * this.scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Пропорции стикмана (в локальных координатах, центр — 0,0)
    const headR = 14;
    const headY = -40;
    const neckY = -26;
    const hipY  = 0;
    const legY  = 30;
    const armY  = -12;
    const armX  = 20;

    // Голова
    if (this.head) {
      // ПОТОМ: рисуем картинку
      const img = this._headImage;
      if (img) {
        ctx.drawImage(img, -headR, headY - headR, headR * 2, headR * 2);
      } else {
        this._drawCircleHead(ctx, headR, headY);
      }
    } else {
      // СЕЙЧАС: кружок
      this._drawCircleHead(ctx, headR, headY);
    }

    // Тело
    ctx.beginPath();
    ctx.moveTo(0, neckY);
    ctx.lineTo(0, hipY);
    ctx.stroke();

    // Руки
    ctx.beginPath();
    ctx.moveTo(-armX, armY);
    ctx.lineTo(0, neckY + 2);
    ctx.lineTo(armX, armY);
    ctx.stroke();

    // Ноги
    ctx.beginPath();
    ctx.moveTo(-armX, legY);
    ctx.lineTo(0, hipY);
    ctx.lineTo(armX, legY);
    ctx.stroke();

    ctx.restore();
  }

  _drawCircleHead(ctx, r, y) {
    ctx.beginPath();
    ctx.arc(0, y, r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  // Размеры (для сцены и физики)
  getBounds() {
    return { width: 60, height: 100, pivotY: 40 };
  }

  serialize() {
    return { body: this.body, head: this.head, color: this.color, scale: this.scale };
  }

  static deserialize(data) {
    return new Avatar(data);
  }
}
