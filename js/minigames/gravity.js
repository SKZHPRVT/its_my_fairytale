// ============================================
// GRAVITY — гонка на мотоцикле
// Физика в стиле Hill Climb Racing / Gravity Defied
// Мультяшная графика
// ============================================

import { MiniGame } from './engine.js';
import { Avatar } from '../player/avatar.js';
import { State } from '../core/state.js';

export class GravityGame extends MiniGame {
  async init() {
    const { assetKey } = this.params;
    console.log('[Gravity] init. assetKey:', assetKey);

    // ---------- Спрайт мотоцикла (рисунок игрока) ----------
    this.sprite = null;
    this.spriteLoaded = false;

    if (assetKey) {
      try {
        const { loadDrawing } = await import('../drawing/export.js');
        const data = await loadDrawing(assetKey);
        if (data && data.dataURL) {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = data.dataURL;
          });
          this.sprite = img;
          this.spriteLoaded = true;
        }
      } catch (e) {
        console.error('[Gravity] Ошибка спрайта:', e);
      }
    }

    // ---------- Аватар ----------
    this.avatar = State.player.avatar
      ? Avatar.deserialize(State.player.avatar)
      : new Avatar({ color: '#3a2e1f' });

    // ---------- Размеры canvas ----------
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();

    // ---------- Мир ----------
    this.world = {
      width: 9000,
      height: this.canvas.height,
      gravity: 1800,
    };

    // ---------- Земля ----------
    this._generateGround();

    // ---------- Финиш (СНАЧАЛА!) ----------
    this.finishX = this.world.width - 300;

    // ---------- Игрок (физика мотоцикла) ----------
    this.bike = {
      x: 200,
      y: this.world.height * 0.5,
      vx: 0,          // горизонтальная скорость
      vy: 0,          // вертикальная скорость
      angle: 0,       // угол наклона
      angularVel: 0,  // угловая скорость
      wheelBase: 70,  // расстояние между колёсами
      wheelR: 22,     // радиус колеса
      mass: 1,
      airTime: 0,
      onGround: false,
    };

    this.camera = { x: 0, y: 0 };
    this.collected = 0;
    this.totalStars = 20;
    this.elapsed = 0;
    this.startTime = performance.now();

    // ---------- Звёзды (ТЕПЕРЬ finishX установлен!) ----------
    this.stars = [];
    this._placeStars(this.totalStars);

    // ---------- Препятствия (камни) ----------
    this.obstacles = [];
    this._placeObstacles();

    // ---------- Облака (параллакс) ----------
    this.clouds = [];
    for (let i = 0; i < 15; i++) {
      this.clouds.push({
        x: Math.random() * this.world.width,
        y: 40 + Math.random() * 120,
        size: 30 + Math.random() * 40,
        speed: 0.2 + Math.random() * 0.3,
      });
    }

    // ---------- Частицы (брызги грязи) ----------
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

  // ---------- Земля с биомами ----------
  _generateGround() {
    this.groundPoints = [];
    const step = 30;
    for (let x = 0; x <= this.world.width; x += step) {
      const baseY = this.world.height * 0.7;
      const p = x / this.world.width;

      let amp1 = 70, amp2 = 30, amp3 = 10;
      let freq1 = 0.005, freq2 = 0.013, freq3 = 0.027;

      // Биом 2: горы
      if (p > 0.25 && p < 0.55) {
        amp1 = 140; amp2 = 50; freq1 = 0.007;
      }
      // Биом 3: ямы
      if (p > 0.55 && p < 0.85) {
        amp1 = 60; amp2 = 80; freq2 = 0.02;
      }
      // Биом 4: холмы + финиш
      if (p >= 0.85) {
        amp1 = 100; amp2 = 40; freq1 = 0.009;
      }

      const y = baseY
              + Math.sin(x * freq1) * amp1
              + Math.sin(x * freq2) * amp2
              + Math.sin(x * freq3) * amp3;

      this.groundPoints.push({ x, y });
    }
  }

  _groundAt(x) {
    const step = 30;
    const i = Math.floor(x / step);
    const p1 = this.groundPoints[i];
    const p2 = this.groundPoints[i + 1] || p1;
    if (!p1) return this.world.height * 0.7;
    const t = (x - p1.x) / step;
    return p1.y + (p2.y - p1.y) * t;
  }

  _groundSlope(x) {
    const ahead = this._groundAt(x + 20);
    const behind = this._groundAt(x - 20);
    return (ahead - behind) / 40;
  }

  // ---------- Звёзды ----------
  _placeStars(count) {
    const startX = 500;
    const endX = this.finishX - 300;
    const seg = (endX - startX) / count;
    for (let i = 0; i < count; i++) {
      const x = startX + seg * i + seg * 0.5;
      const groundY = this._groundAt(x);
      const y = Math.max(80, groundY - 60 - Math.random() * 80);
      this.stars.push({ x, y, taken: false, phase: Math.random() * Math.PI * 2 });
    }
  }

  _placeObstacles() {
    const count = 14;
    const startX = 600;
    const endX = this.finishX - 400;
    for (let i = 0; i < count; i++) {
      const x = startX + (endX - startX) / count * i + Math.random() * 200;
      const groundY = this._groundAt(x);
      this.obstacles.push({
        x,
        y: groundY - 20,
        r: 16 + Math.random() * 8,
        hit: false,
      });
    }
  }

  _bindInput() {
    const down = (e) => {
      const k = e.key?.toLowerCase();
      if (k === 'arrowright' || k === 'd') this.input.gas = true;
      if (k === 'arrowleft' || k === 'a') this.input.brake = true;
    };
    const up = (e) => {
      const k = e.key?.toLowerCase();
      if (k === 'arrowright' || k === 'd') this.input.gas = false;
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
  // ФИЗИКА
  // ============================================
  update(dt) {
    const b = this.bike;
    const g = this.world.gravity;

    this.elapsed += dt;

    // 1. Управление — крутящий момент
    const engineForce = this.input.gas ? 2200 : 0;
    const brakeForce = this.input.brake ? -1800 : 0;

    // Только на земле двигаемся
    if (b.onGround) {
      b.vx += (engineForce + brakeForce) * dt / b.mass;
    } else {
      // В воздухе — небольшой контроль для трюков
      b.angularVel += (this.input.gas ? 3 : 0) * dt;
      b.angularVel += (this.input.brake ? -3 : 0) * dt;
    }

    // 2. Угловая скорость → угол (наклон мотоцикла)
    b.angle += b.angularVel * dt;
    b.angularVel *= 0.92;  // затухание

    // 3. Гравитация
    b.vy += g * dt;

    // 4. Трение (только на земле)
    if (b.onGround) {
      b.vx *= 0.995;
    } else {
      b.vx *= 0.999;
    }

    // 5. Позиция
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // 6. Коллизия колёс с землёй (два колеса!)
    const cosA = Math.cos(b.angle);
    const sinA = Math.sin(b.angle);

    // Позиции колёс
    const frontX = b.x + cosA * b.wheelBase / 2;
    const frontY = b.y + sinA * b.wheelBase / 2;
    const backX = b.x - cosA * b.wheelBase / 2;
    const backY = b.y - sinA * b.wheelBase / 2;

    const frontGroundY = this._groundAt(frontX);
    const backGroundY = this._groundAt(backX);

    let onGroundNow = false;

    // Переднее колесо
    if (frontY + b.wheelR > frontGroundY) {
      const penetration = frontY + b.wheelR - frontGroundY;
      b.y -= penetration * 0.5;
      const slope = this._groundSlope(frontX);
      // Отталкивание
      if (b.vy > 0) {
        b.vy = -Math.abs(b.vy) * 0.3;
      }
      // Наклон вверх по склону
      b.angularVel += -slope * 8 * dt;
      onGroundNow = true;
    }

    // Заднее колесо
    if (backY + b.wheelR > backGroundY) {
      const penetration = backY + b.wheelR - backGroundY;
      b.y -= penetration * 0.5;
      onGroundNow = true;
    }

    b.onGround = onGroundNow;

    // 7. Наклон по склону (когда на земле)
    if (b.onGround) {
      const groundAngle = Math.atan(this._groundSlope(b.x));
      // Плавно выравниваем мотоцикл по земле
      b.angle += (groundAngle - b.angle) * 0.15;
      b.angularVel *= 0.7;
    }

    // 8. Ограничение скорости
    b.vx = Math.max(-300, Math.min(600, b.vx));

    // 9. Камера
    this.camera.x = b.x - this.canvas.width * 0.3;
    this.camera.y = Math.min(0, b.y - this.canvas.height * 0.5);

    // 10. Звёзды
    for (const s of this.stars) {
      if (s.taken) continue;
      s.phase += dt * 3;
      const dx = s.x - b.x;
      const dy = s.y - b.y;
      if (dx * dx + dy * dy < 70 * 70) {
        s.taken = true;
        this.collected++;
      }
    }

    // 11. Препятствия
    for (const o of this.obstacles) {
      if (o.hit) continue;
      const dx = o.x - b.x;
      const dy = o.y - b.y;
      if (dx * dx + dy * dy < (o.r + 40) * (o.r + 40)) {
        o.hit = true;
        b.vx *= 0.4;
        b.angularVel += (Math.random() - 0.5) * 6;
        this._spawnParticles(o.x, o.y, '#8a5a3a');
      }
    }

    // 12. Частицы
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 800 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 13. Облака
    for (const c of this.clouds) {
      c.x -= c.speed * dt * 30;
      if (c.x < this.camera.x - 200) c.x += 1500;
    }

    // 14. Победа / поражение
    if (b.x >= this.finishX) this.win();
    if (b.y > this.world.height + 400) this.lose();
  }

  _spawnParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: -Math.random() * 300,
        life: 0.5 + Math.random() * 0.5,
        color,
      });
    }
  }

  // ============================================
  // РЕНДЕР
  // ============================================
  render() {
    const { ctx, canvas } = this;
    const camX = this.camera.x;

    // Небо (по биомам)
    const progress = this.bike.x / this.finishX;
    let skyTop = '#87ceeb', skyMid = '#b8e0f5', skyBot = '#e8f4ff';
    if (progress > 0.25 && progress < 0.55) {
      skyTop = '#b8a8d8'; skyMid = '#e0d0f0'; skyBot = '#fff0f8';
    } else if (progress > 0.55 && progress < 0.85) {
      skyTop = '#f0b880'; skyMid = '#ffd8a0'; skyBot = '#fff0d0';
    } else if (progress >= 0.85) {
      skyTop = '#5a3a6a'; skyMid = '#a870a0'; skyBot = '#e8a0b0';
    }

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(0.6, skyMid);
    grad.addColorStop(1, skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Солнце
    ctx.fillStyle = 'rgba(255, 240, 180, 0.8)';
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 100, 60, 0, Math.PI * 2);
    ctx.fill();

    // Облака (параллакс 0.4)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (const c of this.clouds) {
      const screenX = c.x - camX * 0.4;
      if (screenX < -100 || screenX > canvas.width + 100) continue;
      ctx.beginPath();
      ctx.arc(screenX, c.y, c.size, 0, Math.PI * 2);
      ctx.arc(screenX + c.size * 0.7, c.y + 5, c.size * 0.8, 0, Math.PI * 2);
      ctx.arc(screenX - c.size * 0.7, c.y + 5, c.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // ==================== МИР ====================
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

    // Тёмная полоса земли (нижний слой)
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#5a7a3b';
    ctx.fillRect(camX, canvas.height * 0.85, canvas.width, canvas.height);
    ctx.restore();

    // Трава (обводка)
    ctx.strokeStyle = '#5a8a3b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    let first = true;
    for (const p of this.groundPoints) {
      if (p.x < camX - 100 || p.x > camX + canvas.width + 100) continue;
      if (first) { ctx.moveTo(p.x, p.y); first = false; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Препятствия (камни)
    for (const o of this.obstacles) {
      if (o.x < camX - 100 || o.x > camX + canvas.width + 100) continue;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fillStyle = o.hit ? '#8a5a3a' : '#888';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Звёзды (монетки, парят)
    const t = performance.now() / 1000;
    for (const s of this.stars) {
      if (s.taken) continue;
      if (s.x < camX - 100 || s.x > camX + canvas.width + 100) continue;
      const dy = Math.sin(t * 3 + s.phase) * 5;
      ctx.font = '36px serif';
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
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ==================== МОТОЦИКЛ ====================
    const b = this.bike;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    // Рисунок игрока — за мотоцикл (если есть)
    // Сначала — тень под мотоциклом
    const gy = this._groundAt(b.x);
    const shadowDist = Math.max(0, gy - b.y - 40);
    const shadowAlpha = Math.max(0, 0.4 - shadowDist * 0.002);
    if (shadowAlpha > 0) {
      ctx.save();
      ctx.translate(0, gy - b.y);
      ctx.rotate(-b.angle);   // компенсируем поворот
      ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 50, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Мотоцикл
    const bw = 130, bh = 70;
    if (this.sprite) {
      ctx.drawImage(this.sprite, -bw / 2, -bh / 2, bw, bh);
    } else {
      // Заглушка — мультяшный мотоцикл
      // Рама
      ctx.fillStyle = '#c75a5a';
      ctx.beginPath();
      ctx.roundRect(-bw / 2 + 10, -bh / 2 + 20, bw - 20, 25, 5);
      ctx.fill();

      // Седло
      ctx.fillStyle = '#5a3a2a';
      ctx.beginPath();
      ctx.roundRect(-bw / 2 + 30, -bh / 2 + 10, 50, 15, 5);
      ctx.fill();

      // Колёса
      const wr = b.wheelR;
      const wFrontX = b.wheelBase / 2;
      const wBackX = -b.wheelBase / 2;
      const wY = bh / 2 - 10;

      // Заднее
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(wBackX, wY, wr, 0, Math.PI * 2);
      ctx.fill();
      // Переднее
      ctx.beginPath();
      ctx.arc(wFrontX, wY, wr, 0, Math.PI * 2);
      ctx.fill();

      // Ободья
      const rotation = b.x * 0.05;
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wBackX, wY, wr * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(wFrontX, wY, wr * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      // Спицы
      ctx.save();
      ctx.translate(wBackX, wY);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(-wr * 0.5, 0); ctx.lineTo(wr * 0.5, 0);
      ctx.moveTo(0, -wr * 0.5); ctx.lineTo(0, wr * 0.5);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(wFrontX, wY);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(-wr * 0.5, 0); ctx.lineTo(wr * 0.5, 0);
      ctx.moveTo(0, -wr * 0.5); ctx.lineTo(0, wr * 0.5);
      ctx.stroke();
      ctx.restore();

      // Фара
      ctx.fillStyle = '#ffe080';
      ctx.beginPath();
      ctx.arc(bw / 2 - 10, -10, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Персонаж
    ctx.save();
    ctx.translate(0, -bh / 2 + 5);
    this.avatar.render(ctx, 0, 0, 0.85);
    ctx.restore();

    ctx.restore();

    ctx.restore();
    // ==================== /МИР ====================

    // ==================== HUD ====================
    ctx.fillStyle = '#3a2e1f';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Звёзды
    ctx.fillText(`⭐ ${this.collected} / ${this.totalStars}`, 20, 20);

    // Таймер
    const min = Math.floor(this.elapsed / 60);
    const sec = Math.floor(this.elapsed % 60);
    ctx.textAlign = 'right';
    ctx.fillText(`⏱ ${min}:${String(sec).padStart(2, '0')}`, canvas.width - 20, 20);

    // Прогресс-бар
    const progressBar = Math.min(1, this.bike.x / this.finishX);
    const barW = canvas.width - 40;
    ctx.fillStyle = 'rgba(58, 46, 31, 0.15)';
    ctx.beginPath();
    ctx.roundRect(20, 60, barW, 16, 8);
    ctx.fill();

    ctx.fillStyle = '#e8b84b';
    ctx.beginPath();
    ctx.roundRect(20, 60, barW * progressBar, 16, 8);
    ctx.fill();

    // Проценты
    ctx.fillStyle = '#3a2e1f';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.floor(progressBar * 100) + '%', canvas.width / 2, 80);

    // Победный оверлей
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

// Polyfill для roundRect (для старых браузеров)
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
