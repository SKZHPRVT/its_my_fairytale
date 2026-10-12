// ============================================
// AVATAR — персонаж (стикман с круглой головой)
// Голова: пустой круг ИЛИ фото/картинка внутри круга
// ============================================

export class Avatar {
  constructor(config = {}) {
    // Пол: 'boy' | 'girl' (пока визуально одинаково, различия — потом)
    this.gender = config.gender || 'boy';

    // Цвет тела (обводка + заливка конечностей)
    this.color = config.color || '#3a2e1f';

    // Цвет головы (круга) — телесный
    this.headColor = config.headColor || '#f4d0a0';

    // Картинка для лица (DataURL) — фото или рисунок
    this.headImage = config.headImage || null;

    // Кэш загруженного изображения
    this._headImgEl = null;
    if (this.headImage) {
      this._loadHeadImage(this.headImage);
    }

    // Масштаб (для рендера в разных местах)
    this.scale = config.scale || 1;
  }

  // Загрузка картинки головы (асинхронно)
  _loadHeadImage(dataURL) {
    const img = new Image();
    img.onload = () => { this._headImgEl = img; };
    img.onerror = () => { console.warn('[Avatar] Не удалось загрузить headImage'); };
    img.src = dataURL;
  }

  // Установить картинку головы
  setHeadImage(dataURL) {
    this.headImage = dataURL;
    if (dataURL) {
      this._loadHeadImage(dataURL);
    } else {
      this._headImgEl = null;
    }
  }

  // ---------- РЕНДЕР ----------
  // Рисует аватара в точке (x, y) — центр ТУЛОВИЩА
  render(ctx, x, y, scale = 1) {
    const s = scale * this.scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ----- Пропорции (в локальных координатах) -----
    const headR = 22;              // радиус головы
    const headCY = -60;            // центр головы по Y
    const neckY = headCY + headR;  // шея
    const hipY = 0;                // бёдра
    const legY = 45;               // ступни
    const armY = 15;               // плечи
    const armX = 28;               // размах рук

    const lineW = 6;               // толщина линий тела

    // ----- ГОЛОВА (круг) -----
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, headCY, headR, 0, Math.PI * 2);
    ctx.closePath();

    // Заливка (телесный цвет)
    ctx.fillStyle = this.headColor;
    ctx.fill();

    // Если есть картинка — обрезаем по кругу и рисуем
    if (this._headImgEl) {
      ctx.save();
      ctx.clip();  // обрезка по кругу
      // Рисуем картинку, масштабируя под диаметр круга
      const d = headR * 2;
      ctx.drawImage(this._headImgEl, -headR, headCY - headR, d, d);
      ctx.restore();
    }

    // Обводка круга
    ctx.strokeStyle = this.color;
    ctx.lineWidth = lineW * 0.7;
    ctx.stroke();
    ctx.restore();

    // ----- ТЕЛО -----
    ctx.strokeStyle = this.color;
    ctx.lineWidth = lineW;

    // Туловище (шея → бёдра)
    ctx.beginPath();
    ctx.moveTo(0, neckY);
    ctx.lineTo(0, hipY);
    ctx.stroke();

    // Руки (плечи → кисти)
    ctx.beginPath();
    ctx.moveTo(-armX, armY);
    ctx.lineTo(0, neckY + 8);
    ctx.lineTo(armX, armY);
    ctx.stroke();

    // Кисти рук (кружки)
    ctx.beginPath();
    ctx.arc(-armX, armY, 5, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(armX, armY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Ноги (бёдра → ступни)
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

  // ---------- Размеры ----------
  getBounds() {
    return {
      width: 100,
      height: 160,
      pivotY: 60,   // смещение центра (голова выше)
    };
  }

  // ---------- Сериализация ----------
  serialize() {
    return {
      gender: this.gender,
      color: this.color,
      headColor: this.headColor,
      headImage: this.headImage,
      scale: this.scale,
    };
  }

  static deserialize(data) {
    return new Avatar(data);
  }
}
