// ============================================
// GRAVITY — гонка (Gravity Defied / Hill Climb)
// ============================================

import { MiniGame } from './engine.js';
import { Avatar } from '../player/avatar.js';
import { State } from '../core/state.js';

export class GravityGame extends MiniGame {
  async init() {
    const { assetKey } = this.params;
    console.log('[Gravity] init. assetKey:', assetKey);

    // Загружаем спрайт мотоцикла
    this.sprite = null;
    this.spriteLoaded = false;

    if (assetKey) {
      try {
        const { loadDrawing } = await import('../drawing/export.js');
        const data = await loadDrawing(assetKey);
        console.log('[Gravity] loadDrawing вернул:', data ? 'OK' : 'null');

        if (data && data.dataURL) {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = data.dataURL;
          });
          this.sprite = img;
          this.spriteLoaded = true;
          console.log('[Gravity] Спрайт загружен:', img.width + 'x' + img.height);
        } else {
          console.warn('[Gravity] Рисунок не найден под ключом:', assetKey);
        }
      } catch (e) {
        console.error('[Gravity] Ошибка загрузки спрайта:', e);
      }
    }

    // Аватар игрока (для отрисовки на мотоцикле)
    this.avatar = State.player.avatar
      ? Avatar.deserialize(State.player.avatar)
      : new Avatar();

    // Мир
    this.world = {
      width: 2000,
      height: this.canvas.height,
      gravity: 1200,
    };

    // Холмы
    this.groundPoints = [];
    const step = 40;
    for (let x = 0; x <= this.world.width; x += step) {
      const y = this.world.height * 0.75
              + Math.sin(x * 0.005) * 60
              + Math.sin(x * 0.013) * 30;
      this.groundPoints.push({ x, y });
    }

    // Игрок
    this.player = {
      x: 100,
      y: this.world.height * 0.5,
      vx: 200,
      vy: 0,
      angle: 0,
      onGround: false,
    };

    // Камера
    this.camera = { x: 0 };

    // Звёзды
    this.stars = [
      { x: 400,  y: 400, taken: false },
      { x: 700,  y: 350, taken: false },
      { x: 1000, y: 400, taken: false },
      { x: 1300, y: 350, taken: false },
      { x: 1600, y: 400, taken: false },
    ];
    this.collected = 0;

    // Финиш
    this.finishX = 1900;

    // Ввод
    this.input = { gas: false, brake: false };
    this._bindInput();
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
    };
  }

  update(dt) {
    const p = this.player;
    const g = this.world.gravity;

    // Управление
    if (this.input.gas)   p.vx += 600 * dt;
    if (this.input.brake) p.vx -= 600 * dt;
    p.vx *= 0.995;

    // Ограничение скорости
    p.vx = Math.max(-100, Math.min(400, p.vx));

    // Гравитация
    p.vy += g * dt;

    // Позиция
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Коллизия с землёй
    const groundY = this._groundAt(p.x);
    if (p.y >= groundY - 20) {
      p.y = groundY - 20;
      // Отскок вверх по склону
      const ahead = this._groundAt(p.x + 30);
      const behind = this._groundAt(p.x - 30);
      const slope = (ahead - behind) / 60;
      p.vy = -Math.abs(p.vx) * slope;
      p.onGround = true;
    } else {
      p.onGround = false;
    }

    // Угол
    const ahead = this._groundAt(p.x + 30);
    const behind = this._groundAt(p.x - 30);
    p.angle = Math.atan2(ahead - behind, 60);

    // Камера
    this.camera.x = p.x - this.canvas.width * 0.3;

    // Звёзды
    for (const s of this.stars) {
      if (!s.taken && Math.hypot(s.x - p.x, s.y - p.y) < 40) {
        s.taken = true;
        this.collected++;
      }
    }

    // Финиш
    if (p.x >= this.finishX) {
      this.win();
    }

    // Падение
    if (p.y > this.world.height + 200) {
      this.lose();
    }
  }

  _groundAt(x) {
    const step = 40;
    const i = Math.floor(x / step);
    const p1 = this.groundPoints[i];
    const p2 = this.groundPoints[i + 1] || p1;
    if (!p1) return this.world.height;
    const t = (x - p1.x) / step;
    return p1.y + (p2.y - p1.y) * t;
  }

  render() {
    const { ctx, canvas } = this;
    const camX = this.camera.x;

    // Небо
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(1, '#e0f0ff');
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

    // Звёзды
    for (const s of this.stars) {
      if (s.taken) continue;
      ctx.font = '32px serif';
      ctx.textAlign = 'center';
      ctx.fillText('⭐', s.x, s.y);
    }

    // Финиш
    ctx.fillStyle = '#c75a5a';
    ctx.fillRect(this.finishX, 0, 8, canvas.height);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#c75a5a';
    ctx.textAlign = 'center';
    ctx.fillText('🏁', this.finishX + 4, 100);

    // ---------- ИГРОК (мотоцикл + персонаж) ----------
    const p = this.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Рисуем мотоцикл (спрайт или заглушка)
    if (this.sprite) {
      // Рисунок игрока — вписываем в 80x40
      ctx.drawImage(this.sprite, -40, -15, 80, 40);
    } else {
      // Заглушка — мотоцикл из прямоугольников
      ctx.fillStyle = '#3a2e1f';
      ctx.fillRect(-30, -10, 60, 20);
      // Колёса
      ctx.beginPath();
      ctx.arc(-20, 15, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(20, 15, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Рисуем персонажа поверх мотоцикла
    ctx.save();
    ctx.translate(0, -25);  // Смещаем вверх — на сиденье
    this.avatar.render(ctx, 0, 0, 0.7);  // Масштаб 0.7
    ctx.restore();

    ctx.restore();
    // ---------- КОНЕЦ ИГРОКА ----------

    ctx.restore();

    // HUD
    ctx.fillStyle = '#3a2e1f';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⭐ ${this.collected} / ${this.stars.length}`, 20, 40);

    // Отладка
    if (!this.spriteLoaded) {
      ctx.fillStyle = '#c00';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('⚠ Спрайт мотоцикла не загружен (используется заглушка)', 20, 70);
    }
  }

  destroy() {
    super.destroy();
    this._cleanupInput?.();
  }
}
