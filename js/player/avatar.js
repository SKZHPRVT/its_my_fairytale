// ============================================
// AVATAR — персонаж (стикман)
// Голова: пустой круг (без заливки) ИЛИ фото внутри
// Контур круга — цвет тела
// ============================================

export class Avatar {
  constructor(config = {}) {
    this.gender = config.gender || 'boy';
    this.color = config.color || '#3a2e1f';
    this.headImage = config.headImage || null;
    this.scale = config.scale || 1;

    this._headImgEl = null;
    if (this.headImage) {
      this._loadHeadImage(this.headImage);
    }
  }

  _loadHeadImage(dataURL) {
    const img = new Image();
    img.onload = () => { this._headImgEl = img; };
    img.onerror = () => { console.warn('[Avatar] Не удалось загрузить headImage'); };
    img.src = dataURL;
  }

  setHeadImage(dataURL) {
    this.headImage = dataURL;
    if (dataURL) {
      this._loadHeadImage(dataURL);
    } else {
      this._headImgEl = null;
    }
  }

  // ---------- РЕНДЕР ----------
  render(ctx, x, y, scale = 1) {
    const s = scale * this.scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ----- Пропорции -----
    const headR = 22;
    const headCY = -60;
    const neckY = headCY + headR;
    const hipY = 0;
    const legY = 45;
    const armY = 15;
    const armX = 28;
    const lineW = 6;

    // ----- ГОЛОВА -----
    ctx.save();

    // 1. Если есть фото — рисуем ВНУТРИ круга (обрезаем по кругу)
    if (this._headImgEl) {
      ctx.beginPath();
      ctx.arc(0, headCY, headR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      const d = headR * 2;
      ctx.drawImage(this._headImgEl, -headR, headCY - headR, d, d);
      ctx.restore();
    }
    // Если фото НЕТ — ничего не заливаем (внутри круга прозрачно)

    // 2. Контур круга — цветом тела
    ctx.beginPath();
    ctx.arc(0, headCY, headR, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = lineW * 0.7;
    ctx.stroke();

    ctx.restore();

    // ----- ТЕЛО -----
    ctx.strokeStyle = this.color;
    ctx.lineWidth = lineW;
    ctx.fillStyle = this.color;

    // Туловище
    ctx.beginPath();
    ctx.moveTo(0, neckY);
    ctx.lineTo(0, hipY);
    ctx.stroke();

    // Руки
    ctx.beginPath();
    ctx.moveTo(-armX, armY);
    ctx.lineTo(0, neckY + 8);
    ctx.lineTo(armX, armY);
    ctx.stroke();

    // Кисти
    ctx.beginPath();
    ctx.arc(-armX, armY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(armX, armY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Ноги
    ctx.beginPath();
    ctx.moveTo(-armX, legY);
    ctx.lineTo(0, hipY);
    ctx.lineTo(armX, legY);
    ctx.stroke();

    // Ступни
    ctx.beginPath();
    ctx.arc(-armX, legY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(armX, legY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getBounds() {
    return { width: 100, height: 160, pivotY: 60 };
  }

  serialize() {
    return {
      gender: this.gender,
      color: this.color,
      headImage: this.headImage,
      scale: this.scale,
    };
  }

  static deserialize(data) {
    return new Avatar(data);
  }
}
