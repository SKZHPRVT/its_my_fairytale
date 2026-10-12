// ============================================
// GRAVITY — гонка (Gravity Defied / Hill Climb)
// Согласованные размеры: мотоцикл + персонаж
// ============================================

import { MiniGame } from './engine.js';
import { Avatar } from '../player/avatar.js';
import { State } from '../core/state.js';

export class GravityGame extends MiniGame {
  async init() {
    const { assetKey } = this.params;
    console.log('[Gravity] init. assetKey:', assetKey);

    // ---------- Размеры (согласованные) ----------
    // Персонаж рисуется в "базовом" размере ~60x100 (по avatar.js)
    // Мотоцикл должен быть примерно 2x ширины персонажа
    this.scale = {
      avatar: 0.9,          // масштаб персонажа
      bikeWidth: 180,       // ширина мотоцикла
      bikeHeight: 90,       // высота мотоцикла
    };

    // Загружаем спрайт мотоцикла
    this.sprite = null;
    this.spriteLoaded = false;

    if (assetKey) {
      try {
        const { loadDrawing } = await import('../drawing/export.js');
        const data = await loadDrawing(assetKey);
        console.log('[Gravity] loadDrawing:', data ? 'OK' : 'null');

        if (data && data.dataURL) {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = data.dataURL;
          });
          this.sprite = img;
          this.spriteLoaded = true;
          console.log('[Gravity] Спрайт:', img.width + 'x' + img.height);
        }
      } catch (e) {
        console.error('[Gravity] Ошибка загрузки спрайта:', e);
      }
    }

    // Аватар
    this.avatar = State.player.avatar
      ? Avatar.deserialize(State.player.avatar)
      : new Avatar({ color: '#3a2e1f' });

    // Размеры
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    // Мир
    this.world = {
      width: 3000,
      height: this.canvas.height,
      gravity: 1600,
    };

    this._generateGround();

    // Игрок
    this.player = {
      x: 150,
      y: this.world.height * 0.4,
      vx: 220,
      vy: 0,
      angle: 0,
      onGround: false,
    };

    this.camera = { x: 0 };
    this.collected = 0;

    this.stars = [];
    this._placeStars(5);

    this.finishX = this.world.width - 150;

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
    }
  }

  _generateGround() {
    this.groundPoints = [];
    const step = 40;
    for (let x = 0; x <= this.world.width; x += step) {
      const baseY = this.world.height * 0.72;
      const y = baseY
              + Math.sin(x * 0.004) * 80
              + Math.sin(x * 0.011) * 40
              + Math.sin(x * 0.023) * 15;
      this.groundPoints.push({ x, y });
    }
  }

  _groundAt(x) {
    const step = 40;
    const i = Math.floor(x / step);
    const p1 = this.groundPoints[i];
    const p2 = this.groundPoints[i + 1] || p1;
    if (!p1) return this.world.height * 0.75;
    const t = (x - p1.x) / step;
    return p1.y + (p2.y - p1.y) * t;
  }

  _placeStars(count) {
    const totalWidth = this.world.width - 400;
    for (let i = 0; i < count; i++) {
      const x = 300 + (totalWidth / count) * i + Math.random() * 100;
      const groundY = this._groundAt(x);
      const y = groundY - 80 - Math.random() * 120;
      this.stars.push({ x, y, taken: false });
    }
  }

  _bindInput() {
    const down = (e) => {
      const key = e.key?.toLowerCase();
      if (key === 'arrowright' || key === 'd') this.input.gas = true;
      if (key === 'arrowleft'  || key === 'a') this.input.brake = true;
    };
    const up = (e) => {
      const key = e.key?.toLowerCase();
      if (key === 'arrowright' || key === 'd') this.input.gas = false;
      if (key === 'arrowleft'  || key === 'a') this.input.brake = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    this._cleanupInput = () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('resize', this._onResize);
    };
  }

  update(dt) {
    const p = this.player;
    const g = this.world.gravity;

    if (this.input.gas)   p.vx += 700 * dt;
    if (this.input.brake) p.vx -= 700 * dt;
    p.vx *= 0.995;
    p.vx = Math.max(-150, Math.min(500, p.vx));

    p.vy += g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const groundY = this._groundAt(p.x);
    if (p.y >= groundY - 40) {
      p.y = groundY - 40;
      const ahead = this._groundAt(p.x + 30);
      const behind = this._groundAt(p.x - 30);
      const slope = (ahead - behind) / 60;
      p.vy = -Math.abs(p.vx) * slope;
      p.onGround = true;
    } else {
      p.onGround = false;
    }

    const ahead = this._groundAt(p.x + 30);
    const behind = this._groundAt(p.x - 30);
    p.angle = Math.atan2(ahead - behind, 60);

    this.camera.x = p.x - this.canvas.width * 0.3;

    for (const s of this.stars) {
      if (!s.taken && Math.hypot(s.x - p.x, s.y - (p.y - 40)) < 60) {
        s.taken = true;
        this.collected++;
      }
    }

    if (p.x >= this.finishX) this.win();
    if (p.y > this.world.height + 300) this.lose();
  }

  render() {
    const { ctx, canvas } = this;
    const camX = this.camera.x;

    // Небо
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(0.6, '#b8e0f5');
    grad.addColorStop(1, '#e8f4ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camX, 0);

    // Земля
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (const p of this.groundPoints) {
      if (p.x < camX - 100 || p.x > camX + canvas.width + 100) continue;
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(this.world.width, canvas.height);
    ctx.closePath();
    ctx.fillStyle = '#7ba05b';
    ctx.fill();

    // Трава
    ctx.strokeStyle = '#5a8a3b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (const p of this.groundPoints) {
      if (p.x < camX - 100 || p.x > camX + canvas.width + 100) continue;
      if (p === this.groundPoints[0]) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Звёзды
    for (const s of this.stars) {
      if (s.taken) continue;
      ctx.font = '40px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', s.x, s.y);
    }

    // Финиш
    ctx.fillStyle = '#c75a5a';
    ctx.fillRect(this.finishX, 0, 8, canvas.height);
    ctx.font = 'bold 60px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏁', this.finishX, canvas.height * 0.3);

    // ---------- ИГРОК ----------
    const p = this.player;
    const bw = this.scale.bikeWidth;
    const bh = this.scale.bikeHeight;
    const avatarScale = this.scale.avatar;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Мотоцикл (спрайт или заглушка) — единый размер
    if (this.sprite) {
      // Центрируем спрайт по центру физического тела
      ctx.drawImage(this.sprite, -bw / 2, -bh / 2, bw, bh);
    } else {
      // Заглушка — большой мотоцикл
      // Рама
      ctx.fillStyle = '#c75a5a';
      ctx.fillRect(-bw / 2, -bh / 2 + 10, bw, bh - 20);

      // Колёса — крупные
      const wheelR = 24;
      const wheelY = bh / 2 - 4;

      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-bw / 2 + wheelR, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bw / 2 - wheelR, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fill();

      // Ободья
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-bw / 2 + wheelR, wheelY, wheelR * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bw / 2 - wheelR, wheelY, wheelR * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Персонаж сверху, "сидит" на мотоцикле
    // Сдвигаем: вверх на половину высоты мотоцикла + чуть вперёд
    ctx.save();
    ctx.translate(0, -bh / 2 - 10);
    this.avatar.render(ctx, 0, 0, avatarScale);
    ctx.restore();

    ctx.restore();
    // ---------- /ИГРОК ----------

    ctx.restore();

    // HUD
    ctx.fillStyle = '#3a2e1f';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`⭐ ${this.collected} / ${this.stars.length}`, 20, 20);

    const progress = Math.min(1, this.player.x / this.finishX);
    ctx.fillStyle = 'rgba(58, 46, 31, 0.2)';
    ctx.fillRect(20, 60, canvas.width - 40, 12);
    ctx.fillStyle = '#e8b84b';
    ctx.fillRect(20, 60, (canvas.width - 40) * progress, 12);
  }

  destroy() {
    super.destroy();
    this._cleanupInput?.();
  }
}
