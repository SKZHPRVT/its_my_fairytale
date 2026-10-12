// ============================================
// GRAVITY — аркада в стиле Gravity Defied / Jelly Car
// Мотоцикл едет сам, игрок наклоняет
// ============================================

import { MiniGame } from './engine.js';
import { Avatar } from '../player/avatar.js';
import { State } from '../core/state.js';

export class GravityGame extends MiniGame {
  async init() {
    const { assetKey } = this.params;
    console.log('[Gravity] init');

    // ---------- Спрайт мотоцикла ----------
    this.sprite = null;
    if (assetKey) {
      try {
        const { loadDrawing } = await import('../drawing/export.js');
        const data = await loadDrawing(assetKey);
        if (data && data.dataURL) {
          const img = new Image();
          await new Promise((res, rej) => {
            img.onload = res; img.onerror = rej;
            img.src = data.dataURL;
          });
          this.sprite = img;
        }
      } catch (e) {}
    }

    // ---------- Аватар ----------
    this.avatar = State.player.avatar
      ? Avatar.deserialize(State.player.avatar)
      : new Avatar({ color: '#3a2e1f' });

    // ---------- Размеры ----------
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();

    this.world = {
      width: 12000,
      height: this.canvas.height,
      gravity: 1800,
    };

    this._generateGround();
    this.finishX = this.world.width - 400;

    // ---------- Мотоцикл ----------
    this.bike = {
      x: 200,
      y: 0,
      vx: 0,          // горизонтальная скорость
      vy: 0,
      angle: 0,       // визуальный угол
      targetAngle: 0, // к какому углу стремимся
      wheelR: 20,
      wheelBase: 60,
      airTime: 0,
      onGround: false,
      crashed: false,
    };

    this.camera = { x: 0, shake: 0 };

    this.collected = 0;
    this.totalStars = 15;
    this.elapsed = 0;
    this.bestSpeed = 0;

    // СТАРТОВАЯ ПОЗИЦИЯ
    this.bike.y = this._groundAt(this.bike.x) - 40;
    this.bike.targetAngle = Math.atan(this._groundSlope(this.bike.x));

    // ---------- Звёзды ----------
    this.stars = [];
    this._placeStars(this.totalStars);

    // ---------- Трамплины ----------
    this.ramps = [];
    this._placeRamps();

    // ---------- Облака ----------
    this.clouds = [];
    for (let i = 0; i < 20; i++) {
      this.clouds.push({
        x: Math.random() * 2000,
        y: 40 + Math.random() * 150,
        size: 20 + Math.random() * 30,
      });
    }

    // ---------- Частицы ----------
    this.particles = [];

    // ---------- Ввод ----------
    this.input = { gas: false, brake: false };
    this._bindInput();
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w > 0 && h > 0) {
      this.canvas.width = w;
      this.canvas.height = h;
      if (this.world) this.world.height = h;
    }
  }

  // ---------- Земля — с трамплинами и ямами ----------
  _generateGround() {
    this.groundPoints = [];
    const step = 25;
    for (let x = 0; x <= this.world.width; x += step) {
      const baseY = this.world.height * 0.7;
      const p = x / this.world.width;

      // Плавные холмы (без «зубцов»)
      let y = baseY
            + Math.sin(x * 0.003) * 100
            + Math.sin(x * 0.007) * 50
            + Math.sin(x * 0.017) * 20;

      // Несколько заметных холмов-трамплинов
      const trampolinePositions = [0.08, 0.18, 0.32, 0.45, 0.58, 0.72, 0.85];
      for (const tp of trampolinePositions) {
        const tx = tp * this.world.width;
        const dx = (x - tx) / 80;
        if (Math.abs(dx) < 4) {
          y -= Math.max(0, (1 - dx * dx * 0.2)) * 130;   // горка вверх
        }
      }

      this.groundPoints.push({ x, y });
    }
  }

  _groundAt(x) {
    const step = 25;
    const i = Math.floor(x / step);
    const p1 = this.groundPoints[i];
    const p2 = this.groundPoints[i + 1] || p1;
    if (!p1) return this.world.height * 0.7;
    const t = (x - p1.x) / step;
    return p1.y + (p2.y - p1.y) * t;
  }

  _groundSlope(x) {
    const ahead = this._groundAt(x + 15);
    const behind = this._groundAt(x - 15);
    return (ahead - behind) / 30;
  }

  // ---------- Звёзды ----------
  _placeStars(count) {
    const startX = 400;
    const endX = this.finishX - 300;
    for (let i = 0; i < count; i++) {
      const x = startX + (endX - startX) / count * i + Math.random() * 80;
      const gy = this._groundAt(x);
      // Всегда чуть выше земли
      this.stars.push({
        x,
        y: gy - 60 - Math.random() * 40,
        taken: false,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // ---------- Трамплины ----------
  _placeRamps() {
    const positions = [0.15, 0.3, 0.5, 0.65, 0.8];
    for (const p of positions) {
      const x = p * this.world.width;
      const gy = this._groundAt(x);
      this.ramps.push({ x, y: gy, angle: -0.4, w: 100, h: 30 });
    }
  }

  _bindInput() {
    const down = (e) => {
      const k = e.key?.toLowerCase();
      if (k === 'arrowright' || k === 'd' || k === ' ') this.input.gas = true;
      if (k === 'arrowleft' || k === 'a') this.input.brake = true;
    };
    const up = (e) => {
      const k = e.key?.toLowerCase();
      if (k === 'arrowright' || k === 'd' || k === ' ') this.input.gas = false;
      if (k === 'arrowleft' || k === 'a') this.input.brake = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    this._cleanupInput = () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('resize', this._onResize);
    };
  }

  // ============================================
  // ФИЗИКА — аркадная, мотоцикл едет сам
  // ============================================
  update(dt) {
    const b = this.bike;
    const g = this.world.gravity;
    this.elapsed += dt;

    // ---------- Автоускорение (едет сам) ----------
    let accel = 0;

    if (b.onGround) {
      // На земле — базовое ускорение
      accel = 250;

      // Наклон вперёд (по склону) — ускоряет
      const slope = this._groundSlope(b.x);
      accel += slope * 800;

      // Газ / тормоз
      if (this.input.gas) accel += 900;
      if (this.input.brake) accel -= 900;
    } else {
      // В воздухе — кувырок
      if (this.input.gas) b.targetAngle += 3 * dt;
      if (this.input.brake) b.targetAngle -= 3 * dt;
    }

    b.vx += accel * dt;

    // Ограничение скорости
    b.vx = Math.max(-150, Math.min(700, b.vx));
    b.bestSpeed = Math.max(b.bestSpeed, b.vx);

    // Трение
    b.vx *= b.onGround ? 0.99 : 0.999;

    // Гравитация
    b.vy += g * dt;

    // Позиция
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // ---------- Коллизия колёс ----------
    const cosA = Math.cos(b.targetAngle);
    const sinA = Math.sin(b.targetAngle);

    const wheelFrontX = b.x + cosA * b.wheelBase / 2;
    const wheelFrontY = b.y + sinA * b.wheelBase / 2 + b.wheelR;
    const wheelBackX = b.x - cosA * b.wheelBase / 2;
    const wheelBackY = b.y - sinA * b.wheelBase / 2 + b.wheelR;

    const gyFront = this._groundAt(wheelFrontX);
    const gyBack = this._groundAt(wheelBackX);

    let onGround = false;
    let contactAngle = 0;

    // Переднее колесо
    if (wheelFrontY > gyFront) {
      b.y -= (wheelFrontY - gyFront) * 0.6;
      if (b.vy > 0) b.vy = -Math.abs(b.vy) * 0.2;
      onGround = true;
      contactAngle = Math.atan(this._groundSlope(wheelFrontX));
    }

    // Заднее колесо
    if (wheelBackY > gyBack) {
      b.y -= (wheelBackY - gyBack) * 0.6;
      onGround = true;
      if (contactAngle === 0) contactAngle = Math.atan(this._groundSlope(wheelBackX));
    }

    b.onGround = onGround;

    // ---------- Наклон (визуальный) ----------
    if (onGround) {
      // На земле — прилипаем к склону
      b.targetAngle = contactAngle;
      b.airTime = 0;
    } else {
      b.airTime += dt;
      // В воздухе — плавный переход к целевому углу
      // (уже накапливается выше через input)
    }

    // Плавное вращение к целевому
    b.angle += (b.targetAngle - b.angle) * 0.25;

    // Ограничение угла (не перевернуться полностью вне воздуха)
    if (onGround) {
      b.angle = Math.max(-1.2, Math.min(1.2, b.angle));
      b.targetAngle = b.angle;
    }

    // ---------- Камера ----------
    const targetCamX = b.x - this.canvas.width * 0.35;
    this.camera.x += (targetCamX - this.camera.x) * 0.15;

    // Тряска на большой скорости
    if (b.vx > 400) {
      this.camera.shake = Math.min(3, (b.vx - 400) / 100);
    } else {
      this.camera.shake *= 0.9;
    }

    // ---------- Пыль/следы ----------
    if (onGround && Math.abs(b.vx) > 100 && Math.random() < 0.6) {
      this.particles.push({
        x: b.x - cosA * 30,
        y: b.y + sinA * 30 + b.wheelR,
        vx: -b.vx * 0.3 + (Math.random() - 0.5) * 50,
        vy: -Math.random() * 100,
        life: 0.4 + Math.random() * 0.3,
        color: '#a08060',
        size: 3 + Math.random() * 3,
      });
    }

    // ---------- Звёзды ----------
    for (const s of this.stars) {
      if (s.taken) continue;
      s.phase += dt * 3;
      const dx = s.x - b.x;
      const dy = s.y - (b.y - 30);
      if (dx * dx + dy * dy < 60 * 60) {
        s.taken = true;
        this.collected++;
        // Бонус к скорости
        b.vx += 30;
        this.camera.shake = 2;
      }
    }

    // ---------- Частицы ----------
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // ---------- Победа/поражение ----------
    if (b.x >= this.finishX) this.win();
    if (b.y > this.world.height + 400) this.lose();
  }

  // ============================================
  // РЕНДЕР
  // ============================================
  render() {
    const { ctx, canvas } = this;
    const camX = this.camera.x;
    const shakeX = (Math.random() - 0.5) * this.camera.shake;
    const shakeY = (Math.random() - 0.5) * this.camera.shake;

    // Небо
    const p = this.bike.x / this.finishX;
    let skyTop = '#87ceeb', skyMid = '#b8e0f5', skyBot = '#e8f4ff';
    if (p > 0.25 && p < 0.5) { skyTop = '#b8a8d8'; skyMid = '#e0d0f0'; skyBot = '#fff0f8'; }
    else if (p > 0.5 && p < 0.75) { skyTop = '#f0b880'; skyMid = '#ffd8a0'; skyBot = '#fff0d0'; }
    else if (p >= 0.75) { skyTop = '#5a3a6a'; skyMid = '#a870a0'; skyBot = '#e8a0b0'; }

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(0.6, skyMid);
    grad.addColorStop(1, skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Солнце
    ctx.fillStyle = 'rgba(255, 240, 180, 0.85)';
    ctx.beginPath();
    ctx.arc(canvas.width - 90, 90, 55, 0, Math.PI * 2);
    ctx.fill();

    // Облака (параллакс)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (const c of this.clouds) {
      const sx = c.x - camX * 0.35;
      if (sx < -100 || sx > canvas.width + 100) continue;
      ctx.beginPath();
      ctx.arc(sx, c.y, c.size, 0, Math.PI * 2);
      ctx.arc(sx + c.size * 0.7, c.y + 6, c.size * 0.8, 0, Math.PI * 2);
      ctx.arc(sx - c.size * 0.7, c.y + 6, c.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---------- Мир ----------
    ctx.save();
    ctx.translate(-camX + shakeX, shakeY);

    // Земля
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (const pt of this.groundPoints) {
      if (pt.x < camX - 100 || pt.x > camX + canvas.width + 100) continue;
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.lineTo(this.world.width, canvas.height);
    ctx.closePath();
    ctx.fillStyle = '#7ba05b';
    ctx.fill();

    // Тёмная полоса
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#5a7a3b';
    ctx.fillRect(camX - 50, canvas.height * 0.85, canvas.width + 100, canvas.height);
    ctx.restore();

    // Трава
    ctx.strokeStyle = '#5a8a3b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    let first = true;
    for (const pt of this.groundPoints) {
      if (pt.x < camX - 100 || pt.x > camX + canvas.width + 100) continue;
      if (first) { ctx.moveTo(pt.x, pt.y); first = false; }
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();

    // Звёзды
    const t = performance.now() / 1000;
    for (const s of this.stars) {
      if (s.taken) continue;
      if (s.x < camX - 100 || s.x > camX + canvas.width + 100) continue;
      const dy = Math.sin(t * 3 + s.phase) * 5;
      ctx.font = '34px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', s.x, s.y + dy);
    }

    // Финиш
    if (this.finishX > camX - 200 && this.finishX < camX + canvas.width + 200) {
      ctx.fillStyle = '#c75a5a';
      ctx.fillRect(this.finishX - 4, 0, 8, canvas.height);
      ctx.font = 'bold 70px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏁', this.finishX, canvas.height * 0.3);
    }

    // Частицы
    for (const p2 of this.particles) {
      ctx.globalAlpha = Math.max(0, p2.life * 2);
      ctx.fillStyle = p2.color;
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, p2.size || 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ---------- МОТОЦИКЛ ----------
    const b = this.bike;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    // Тень под мотоциклом
    const gy = this._groundAt(b.x);
    const shadowDist = Math.max(0, gy - b.y - 20);
    const shadowAlpha = Math.max(0, 0.35 - shadowDist * 0.002);
    if (shadowAlpha > 0 && b.onGround) {
      ctx.save();
      ctx.translate(0, gy - b.y - 5);
      ctx.rotate(-b.angle);
      ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 55, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Рисунок игрока
    const bw = 130, bh = 70;
    if (this.sprite) {
      ctx.drawImage(this.sprite, -bw / 2, -bh / 2, bw, bh);
    } else {
      // Мультяшный мотоцикл
      const wr = b.wheelR;
      const wFrontX = b.wheelBase / 2;
      const wBackX = -b.wheelBase / 2;
      const wY = 20;

      // Рама
      ctx.fillStyle = '#c75a5a';
      ctx.beginPath();
      ctx.roundRect(-40, -10, 80, 28, 6);
      ctx.fill();

      // Седло
      ctx.fillStyle = '#3a2e1f';
      ctx.beginPath();
      ctx.roundRect(-25, -20, 45, 14, 5);
      ctx.fill();

      // Руль
      ctx.strokeStyle = '#3a2e1f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(25, -15);
      ctx.lineTo(40, -25);
      ctx.stroke();

      // Колёса (с вращением)
      const rotation = b.x * 0.05;
      for (const wx of [wBackX, wFrontX]) {
        // Шина
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(wx, wY, wr, 0, Math.PI * 2);
        ctx.fill();
        // Диск
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.arc(wx, wY, wr * 0.65, 0, Math.PI * 2);
        ctx.fill();
        // Спицы
        ctx.save();
        ctx.translate(wx, wY);
        ctx.rotate(rotation);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-wr * 0.55, 0); ctx.lineTo(wr * 0.55, 0);
        ctx.moveTo(0, -wr * 0.55); ctx.lineTo(0, wr * 0.55);
        ctx.moveTo(-wr * 0.4, -wr * 0.4); ctx.lineTo(wr * 0.4, wr * 0.4);
        ctx.moveTo(wr * 0.4, -wr * 0.4); ctx.lineTo(-wr * 0.4, wr * 0.4);
        ctx.stroke();
        ctx.restore();
      }

      // Фара
      ctx.fillStyle = '#ffe080';
      ctx.beginPath();
      ctx.arc(38, -20, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Персонаж (за рулём, чуть откинут)
    ctx.save();
    ctx.translate(0, -bh / 2 + 5);
    this.avatar.render(ctx, 0, 0, 0.85);
    ctx.restore();

    ctx.restore();

    ctx.restore();
    // ---------- /Мир ----------

    // ---------- HUD ----------
    ctx.fillStyle = '#3a2e1f';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`⭐ ${this.collected} / ${this.totalStars}`, 20, 20);

    ctx.textAlign = 'right';
    const min = Math.floor(this.elapsed / 60);
    const sec = Math.floor(this.elapsed % 60);
    ctx.fillText(`⏱ ${min}:${String(sec).padStart(2, '0')}`, canvas.width - 20, 20);

    // Скорость
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = 'rgba(58, 46, 31, 0.7)';
    ctx.fillText(`🚀 ${Math.round(this.bike.vx)} км/ч`, 20, 55);

    // Прогресс
    const progressBar = Math.min(1, this.bike.x / this.finishX);
    const barW = canvas.width - 40;
    ctx.fillStyle = 'rgba(58, 46, 31, 0.15)';
    ctx.beginPath();
    ctx.roundRect(20, 85, barW, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#e8b84b';
    ctx.beginPath();
    ctx.roundRect(20, 85, barW * progressBar, 12, 6);
    ctx.fill();

    // Оверлеи
    if (this.state === 'win') {
      ctx.fillStyle = 'rgba(58, 46, 31, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e8b84b';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏆 ПОБЕДА!', canvas.width / 2, canvas.height / 2 - 80);
      ctx.fillStyle = '#fdf6e3';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(`⭐ ${this.collected} / ${this.totalStars}`, canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillText(`⏱ ${min}:${String(sec).padStart(2, '0')}`, canvas.width / 2, canvas.height / 2 + 60);
    }
    if (this.state === 'lose') {
      ctx.fillStyle = 'rgba(58, 46, 31, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#c75a5a';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💥 УПАЛ!', canvas.width / 2, canvas.height / 2);
    }
  }

  destroy() {
    super.destroy();
    this._cleanupInput?.();
  }
}

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}
