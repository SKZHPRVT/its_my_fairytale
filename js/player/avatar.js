// ============================================
// AVATAR — персонаж (стикман)
// Круглая голова + фото внутри
// Заготовки под одежду (верх/низ/обувь)
// ============================================

import { Storage } from '../core/storage.js';

const STORAGE_KEY = 'avatar';

export class Avatar {
  constructor(config = {}) {
    this.gender = config.gender || 'boy';
    this.color = config.color || '#3a2e1f';
    this.headImage = config.headImage || null;

    // Заготовки под одежду (пока null)
    this.top = config.top || null;        // { type, color }
    this.bottom = config.bottom || null;  // { type, color }
    this.shoes = config.shoes || null;    // { type, color }

    this.scale = config.scale || 1;

    this._headImgEl = null;
    this._onReady = null;
    this._headLoaded = false;

    if (this.headImage) {
      this._loadHeadImage(this.headImage);
    } else {
      this._headLoaded = true;
    }
  }

  _loadHeadImage(dataURL) {
    if (!dataURL) {
      this._headImgEl = null;
      this._headLoaded = true;
      if (this._onReady) this._onReady();
      return;
    }
    const img = new Image();
    img.onload = () => {
      this._headImgEl = img;
      this._headLoaded = true;
      if (this._onReady) this._onReady();
    };
    img.onerror = () => {
      console.warn('[Avatar] Не удалось загрузить headImage');
      this._headLoaded = true;
      if (this._onReady) this._onReady();
    };
    img.src = dataURL;
  }

  setHeadImage(dataURL, onReady = null) {
    this.headImage = dataURL;
    this._onReady = onReady;
    this._loadHeadImage(dataURL);
  }

  // Ждать загрузки картинки (для синхронизации)
  waitForHead() {
    if (this._headLoaded) return Promise.resolve();
    return new Promise((resolve) => {
      this._onReady = resolve;
    });
  }

  // ---------- РЕНДЕР ----------
  render(ctx, x, y, scale = 1) {
    const s = scale * this.scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const headR = 22;
    const headCY = -60;
    const neckY = headCY + headR;
    const hipY = 0;
    const legY = 45;
    const armY = 15;
    const armX = 28;
    const lineW = 6;

    // ----- НОГИ (низ) -----
    // Пока просто линии; потом — одежда
    ctx.strokeStyle = this.color;
    ctx.lineWidth = lineW;
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.moveTo(-armX, legY);
    ctx.lineTo(0, hipY);
    ctx.lineTo(armX, legY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-armX, legY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(armX, legY, 5, 0, Math.PI * 2);
    ctx.fill();

    // ----- ТУЛОВИЩЕ -----
    ctx.beginPath();
    ctx.moveTo(0, neckY);
    ctx.lineTo(0, hipY);
    ctx.stroke();

    // ----- РУКИ -----
    ctx.beginPath();
    ctx.moveTo(-armX, armY);
    ctx.lineTo(0, neckY + 8);
    ctx.lineTo(armX, armY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-armX, armY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(armX, armY, 5, 0, Math.PI * 2);
    ctx.fill();

    // ----- ГОЛОВА -----
    ctx.save();

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

    // Контур
    ctx.beginPath();
    ctx.arc(0, headCY, headR, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = lineW * 0.7;
    ctx.stroke();

    ctx.restore();

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
      top: this.top,
      bottom: this.bottom,
      shoes: this.shoes,
      scale: this.scale,
    };
  }

  static deserialize(data) {
    return new Avatar(data);
  }
}
