// ============================================
// GRAVITY — гонка (Hill Climb Racing style)
// Длинная трасса, биомы, звёзды, препятствия
// ============================================

import { MiniGame } from './engine.js';
import { Avatar } from '../player/avatar.js';
import { State } from '../core/state.js';

export class GravityGame extends MiniGame {
  async init() {
    const { assetKey } = this.params;
    console.log('[Gravity] init. assetKey:', assetKey);

    // ---------- Размеры ----------
    this.scale = {
      avatar: 0.9,
      bikeWidth: 180,
      bikeHeight: 90,
    };

    // ---------- Спрайт мотоцикла ----------
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
        }
      } catch (e) {
        console.error('[Gravity] Ошибка загрузки спрайта:', e);
      }
    }

    // ---------- Аватар ----------
    console.log('[Gravity] State.player.avatar:', State.player.avatar);
    console.log('[Gravity] headImage есть?', !!State.player.avatar?.headImage);
    this.avatar = State.player.avatar
      ? Avatar.deserialize(State.player.avatar)
      : new Avatar({ color: '#3a2e1f' });

    // ---------- Размеры canvas ----------
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    // ---------- Мир ----------
    this.world = {
      width: 9000,             // длинная трасса
      height: this.canvas.height,
      gravity: 1600,
    };

    // ---------- Земля (разные биомы) ----------
    this._generateGround();

    // ---------- Игрок ----------
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
    this.totalStars = 15;
    this.startTime = 0;
    this.elapsed = 0;

    // ---------- Звёзды ----------
    this.stars = [];
    this._placeStars(this.totalStars);

    // ---------- Препятствия ----------
    this.obstacles = [];
    this._placeObstacles();

    // ---------- Финиш ----------
    this.finishX = this.world.width - 200;

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
    }
    this.world && (this.world.height = h);
  }

  // ---------- Земля ----------
  _generateGround() {
    this.groundPoints = [];
    const step = 40;
    for (let x = 0; x <= this.world.width; x += step) {
      const baseY = this.world.height * 0.72;
      const progress = x / this.world.width;

      // Разные биомы по мере движения
      let amp1 = 80, amp2 = 40, amp3 = 15;
      let freq1 = 0.004, freq2 = 0.011, freq3 = 0.023;

      // Биом 2 — горы (30-60%)
      if (progress > 0.3 && progress < 0.6) {
        amp1 = 140; amp2 = 70; freq1 = 0.006;
      }
      // Биом 3 — плато с ямами (60-90%)
      if (progress > 0.6 && progress < 0.9) {
        amp1 = 60; amp2 = 90; freq2 = 0.018;
      }

      const y = baseY
              + Math.sin(x * freq1) * amp1
              + Math.sin(x * freq2) * amp2
              + Math.sin(x * freq3) * amp3;

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

  // ---------- Звёзды над землёй ----------
  _placeStars(count) {
    const startX = 400;
    const endX = this.finishX - 200;
    const totalWidth = endX - startX;
    for (let i = 0; i < count; i++) {
      const x = startX + (totalWidth / count) * i + Math.random() * 80;
      const groundY = this._groundAt(x);
      const y = groundY - 80 - Math.random() * 140;
      this.stars.push({ x, y, taken: false });
    }
  }

  // ---------- Препятствия (камни) ----------
  _placeObstacles() {
    const count = 12;
    const startX = 500;
    const endX = this.finishX - 300;
    for (let i = 0; i < count; i++) {
      const x = startX + (endX - startX) / count * i + Math.random() * 200;
      const groundY = this._groundAt(x);
      this.obstacles.push({
        x,
        y: groundY - 25,
        r: 18 + Math.random() * 10,
        hit: false,
      });
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

    // Таймер
    this.elapsed += dt;

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

    // Камера
    this.camera.x = p.x - this.canvas.width * 0.3;

    // Звёзды
    for (const s of this.stars) {
      if (!s.taken && Math.hypot(s.x - p.x, s.y - (p.y - 40)) < 60) {
        s.taken = true;
        this.collected++;
        this.onStarCollected?.();
      }
    }

    // Препятствия — замедление при столкновении
    for (const o of this.obstacles) {
      if (!o.hit && Math.hypot(o.x - p.x, o.y - (p.y - 20)) < o.r + 40) {
        o.hit = true;
        p.vx *= 0.4;   // замедление
        this.onObstacleHit?.();
      }
    }

    // Финиш
    if (p.x >= this.finishX) {
      this.win();
    }

    // Падение
    if (p.y > this.world.height + 300) {
      this.lose();
    }
  }

  render() {
    const { ctx, canvas } = this;
    const camX = this.camera.x;

    // Небо — по биомам
    const progress = this.player.x / this.finishX;
    let skyTop = '#87ceeb';
    let skyBot = '#e8f4ff';

    if (progress > 0.3 && progress < 0.6) {
      skyTop = '#b8a8d8'; skyBot = '#f0e0f0';
    } else if (progress > 0.6 && progress < 0.9) {
      skyTop = '#f0b880'; skyBot = '#ffe8c8';
    } else if (progress >= 0.9) {
      skyTop = '#5a3a6a'; skyBot = '#c880a0';
    }

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(0.6, skyBot);
    grad.addColorStop(1, '#f4e4c1');
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

    // Препятствия (камни)
    for (const o of this.obstacles) {
      if (o.x < camX - 100 || o.x > camX + canvas.width + 100) continue;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fillStyle = o.hit ? '#8a5a3a' : '#666';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Звёзды
    for (const s of this.stars) {
      if (s.taken) continue;
      if (s.x < camX - 100 || s.x > camX + canvas.width + 100) continue;
      ctx.font = '40px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', s.x, s.y);
    }

    // Финиш
    if (this.finishX > camX - 200 && this.finishX < camX + canvas.width + 200) {
      ctx.fillStyle = '#c75a5a';
      ctx.fillRect(this.finishX, 0, 8, canvas.height);
      ctx.font = 'bold 60px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏁', this.finishX, canvas.height * 0.3);
    }

    // ---------- ИГРОК ----------
    const p = this.player;
    const bw = this.scale.bikeWidth;
    const bh = this.scale.bikeHeight;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Мотоцикл
    if (this.sprite) {
      ctx.drawImage(this.sprite, -bw / 2, -bh / 2, bw, bh);
    } else {
      ctx.fillStyle = '#c75a5a';
      ctx.fillRect(-bw / 2, -bh / 2 + 10, bw, bh - 20);

      const wheelR = 24;
      const wheelY = bh / 2 - 4;

      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-bw / 2 + wheelR, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bw / 2 - wheelR, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#888';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-bw / 2 + wheelR, wheelY, wheelR * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bw / 2 - wheelR, wheelY, wheelR * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Персонаж
    ctx.save();
    ctx.translate(0, -bh / 2 - 5);
    this.avatar.render(ctx, 0, 0, this.scale.avatar);
    ctx.restore();

    ctx.restore();

    ctx.restore();

    // ---------- HUD ----------
    // Счётчик звёзд
    ctx.fillStyle = '#3a2e1f';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`⭐ ${this.collected} / ${this.totalStars}`, 20, 20);

    // Таймер
    ctx.textAlign = 'right';
    const min = Math.floor(this.elapsed / 60);
    const sec = Math.floor(this.elapsed % 60);
    ctx.fillText(`${min}:${String(sec).padStart(2, '0')}`, canvas.width - 20, 20);

    // Прогресс-бар
    const progressBar = Math.min(1, this.player.x / this.finishX);
    const barW = canvas.width - 40;
    ctx.fillStyle = 'rgba(58, 46, 31, 0.2)';
    ctx.fillRect(20, 60, barW, 12);
    ctx.fillStyle = '#e8b84b';
    ctx.fillRect(20, 60, barW * progressBar, 12);

    // Текст прогресса
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
