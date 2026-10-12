// ============================================
// AVATAR — персонаж (стикман)
// ============================================

import { Storage } from '../core/storage.js';

const STORAGE_KEY = 'avatar';

export class Avatar {
  constructor(config = {}) {
    this.gender = config.gender || 'boy';
    this.color = config.color || '#3a2e1f';
    this.headImage = config.headImage || null;
    this.scale = config.scale || 1;

    this._headImgEl = null;
    this._onReady = null;

    if (this.headImage) {
      this._loadHeadImage(this.headImage);
    }
  }

  _loadHeadImage(dataURL) {
    if (!dataURL) {
      this._headImgEl = null;
      if (this._onReady) this._onReady();
      return;
    }
    const img = new Image();
    img.onload = () => {
      this._headImgEl = img;
      if (this._onReady) this._onReady();
    };
    img.onerror = () => {
      console.warn('[Avatar] Не удалось загрузить headImage');
      if (this._onReady) this._onReady();
    };
    img.src = dataURL;
  }

  setHeadImage(dataURL, onReady = null) {
    this.headImage = dataURL;
    this._onReady = onReady;
    this._loadHeadImage(dataURL);
  }

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

    // Голова
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

    ctx.beginPath();
    ctx.arc(0, headCY, headR, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = lineW * 0.7;
    ctx.stroke();
    ctx.restore();

    // Тело
    ctx.strokeStyle = this.color;
    ctx.lineWidth = lineW;
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.moveTo(0, neckY);
    ctx.lineTo(0, hipY);
    ctx.stroke();

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

  // ---------- СОХРАНЕНИЕ / ЗАГРУЗКА ----------
  static async save(config) {
    try {
      const ok = await Storage.saveData(STORAGE_KEY, config);
      console.log('[Avatar] Сохранён в IndexedDB:', ok);
      return ok;
    } catch (e) {
      console.error('[Avatar] Ошибка сохранения:', e);
      return false;
    }
  }

  static async load() {
    try {
      const data = await Storage.loadData(STORAGE_KEY);
      console.log('[Avatar] Загружен из IndexedDB:', data ? 'OK' : 'null');
      return data;
    } catch (e) {
      console.error('[Avatar] Ошибка загрузки:', e);
      return null;
    }
  }
}
