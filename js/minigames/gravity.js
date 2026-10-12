// ============================================
// GRAVITY — аркада как Gravity Defied / Jelly Car
// Длинная трасса, петли, трюки, комбо
// ============================================

import { MiniGame } from './engine.js';
import { Avatar } from '../player/avatar.js';
import { State } from '../core/state.js';

export class GravityGame extends MiniGame {
  async init() {
    const { assetKey } = this.params;
    console.log('[Gravity] init');

    // ---------- Спрайт ----------
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
      width: 30000,   // ← длиннее (было 12000)
      height: this.canvas.height,
      gravity: 1800,
    };

    this._generateGround();
    this.finishX = this.world.width - 500;

    // ---------- Мотоцикл ----------
    this.bike = {
      x: 200,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      targetAngle: 0,
      wheelR: 20,
      wheelBase: 60,
      airTime: 0,
      onGround: false,
    };
    this.bike.y = this._groundAt(this.bike.x) - 40;

    this.camera = { x: 0, shake: 0 };

    this.collected = 0;
    this.totalStars = 40;   // ← больше звёзд
    this.elapsed = 0;
    this.bestSpeed = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;

    // ---------- Звёзды ----------
    this.stars = [];
    this._placeStars(this.totalStars);

    // ---------- Петли (loopings) ----------
    this.loops = [];
    this._placeLoops();

    // ---------- Птицы ----------
    this.birds = [];
    for (let i = 0; i < 10; i++) {
      this.birds.push({
        x: Math.random() * this.world.width,
        y: 60 + Math.random() * 100,
        speed: 30 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // ---------- Облака ----------
    this.clouds = [];
    for (let i = 0; i < 40; i++) {
      this.clouds.push({
        x: Math.random() * this.world.width,
        y: 40 + Math.random() * 180,
        size: 20 + Math.random() * 30,
      });
    }

    // ---------- Следы шин ----------
    this.tracks = [];

    // ---------- Частицы ----------
    this.particles = [];

    // ---------- Смайлики-эмоции (при прыжке, падении) ----------
    this.emotes = [];

    // ---------- Флаги-чекпоинты ----------
    this.checkpoints = [];
    for (let i = 1; i <= 4; i++) {
      const cx = (this.world.width / 5) * i;
      this.checkpoints.push({ x: cx, passed: false });
    }

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

  // ============================================
  // ЗЕМЛЯ
  // ============================================
  _generateGround() {
    this.groundPoints = [];
    const step = 25;
    for (let x = 0; x <= this.world.width; x += step) {
      const baseY = this.world.height * 0.7;
      const p = x / this.world.width;

      // Плавная основа
      let y = baseY
            + Math.sin(x * 0.0015) * 100
            + Math.sin(x * 0.004) * 60
            + Math.sin(x * 0.012) * 25;

      // Разные биомы
      if (p > 0.2 && p < 0.4) {
        // Горы
        y += Math.sin(x * 0.008) * 80;
      }
      if (p > 0.4 && p < 0.6) {
        // Ровное плато
        y = baseY - 20 + Math.sin(x * 0.005) * 30;
      }
      if (p > 0.6 && p < 0.8) {
        // Волнистые холмы
        y += Math.sin(x * 0.01) * 70;
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

  // ============================================
  // РАЗМЕЩЕНИЕ
  // ============================================
  _placeStars(count) {
    const startX = 400;
    const endX = this.finishX - 300;
    for (let i = 0; i < count; i++) {
      const x = startX + (endX - startX) / count * i + Math.random() * 100;
      const gy = this._groundAt(x);
      // Иногда звёзды на высоте (призыв к прыжку!)
      const highStar = Math.random() < 0.3;
      this.stars.push({
        x,
        y: highStar ? gy - 200 - Math.random() * 100 : gy - 50 - Math.random() * 30,
        taken: false,
        phase: Math.random() * Math.PI * 2,
        high: highStar,
      });
    }
  }

  _placeLoops() {
    // Петель нет как «объектов» — они возникают в земле (см. _generateGround)
    // Здесь оставлю заглушку
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
  // ФИЗИКА
  // ============================================
  update(dt) {
    const b = this.bike;
    const g = this.world.gravity;
    this.elapsed += dt;

    // Автоускорение (медленнее — чтобы карта была интересной)
    let accel = 0;
    if (b.onGround) {
      accel = 180;                                   // базовое
      const slope = this._groundSlope(b.x);
      accel += slope * 700;                          // по склону
      if (this.input.gas) accel += 500;
      if (this.input.brake) accel -= 500;
    } else {
      if (this.input.gas) b.targetAngle += 2.5 * dt;
      if (this.input.brake) b.targetAngle -= 2.5 * dt;
    }

    b.vx += accel * dt;
    b.vx = Math.max(-100, Math.min(450, b.vx));      // ← ограничил скорость (было 700)
    b.bestSpeed = Math.max(b.bestSpeed, b.vx);
    b.vx *= b.onGround ? 0.995 : 0.999;

    b.vy += g * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // ---------- Коллизия колёс ----------
    const cosA = Math.cos(b.targetAngle);
    const sinA = Math.sin(b.targetAngle);

    const frontX = b.x + cosA * b.wheelBase / 2;
    const frontY = b.y + sinA * b.wheelBase / 2 + b.wheelR;
    const backX = b.x - cosA * b.wheelBase / 2;
    const backY = b.y - sinA * b.wheelBase / 2 + b.wheelR;

    const gyFront = this._groundAt(frontX);
    const gyBack = this._groundAt(backX);

    let onGround = false;
    let contactAngle = 0;

    if (frontY > gyFront) {
      b.y -= (frontY - gyFront) * 0.7;
      if (b.vy > 0) b.vy = -Math.abs(b.vy) * 0.15;
      onGround = true;
      contactAngle = Math.atan(this._groundSlope(frontX));
    }
    if (backY > gyBack) {
      b.y -= (backY - gyBack) * 0.7;
      onGround = true;
      if (contactAngle === 0) contactAngle = Math.atan(this._groundSlope(backX));
    }

    const wasInAir = !b.onGround;
    b.onGround = onGround;

    // ---------- Приземление / прыжок ----------
    if (onGround && wasInAir && b.airTime > 0.3) {
      // Приземление — тряска + смайлик
      this.camera.shake = Math.min(6, b.airTime * 4);
      this._spawnEmote(b.x, b.y - 60, '💨');
      // Бонус к скорости за приземление
      b.vx += 50;
    }

    // ---------- Угол ----------
    if (onGround) {
      b.targetAngle = contactAngle;
      b.airTime = 0;
    } else {
      b.airTime += dt;
      // Смайлик при долгом прыжке
      if (b.airTime > 0.8 && Math.random() < 0.02) {
        this._spawnEmote(b.x, b.y - 80, '😜');
      }
    }

    b.angle += (b.targetAngle - b.angle) * 0.25;
    if (onGround) {
      b.angle = Math.max(-1.2, Math.min(1.2, b.angle));
      b.targetAngle = b.angle;
    }

    // ---------- Камера ----------
    const targetCamX = b.x - this.canvas.width * 0.35;
    this.camera.x += (targetCamX - this.camera.x) * 0.15;
    if (b.vx > 300) {
      this.camera.shake = Math.max(this.camera.shake, Math.min(2, (b.vx - 300) / 150));
    } else {
      this.camera.shake *= 0.9;
    }

    // ---------- Следы шин ----------
    if (onGround && Math.abs(b.vx) > 80 && Math.random() < 0.3) {
      this.tracks.push({
        x: b.x - cosA * 30,
        y: this._groundAt(b.x - cosA * 30) - 2,
        life: 3,
      });
    }
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      this.tracks[i].life -= dt;
      if (this.tracks[i].life <= 0) this.tracks.splice(i, 1);
    }

    // ---------- Пыль ----------
    if (onGround && Math.abs(b.vx) > 100 && Math.random() < 0.5) {
      this.particles.push({
        x: b.x - cosA * 30,
        y: b.y + sinA * 30 + b.wheelR,
        vx: -b.vx * 0.3 + (Math.random() - 0.5) * 50,
        vy: -Math.random() * 80,
        life: 0.3 + Math.random() * 0.3,
        color: '#a08060',
        size: 3 + Math.random() * 3,
      });
    }

    // ---------- Комбо ----------
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) {
      this.combo = 0;
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

        // Комбо
        this.combo++;
        this.comboTimer = 2.5;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        b.vx += 25;

        // Смайлик за комбо
        if (this.combo === 3) this._spawnEmote(b.x, b.y - 80, '🔥');
        if (this.combo === 5) this._spawnEmote(b.x, b.y - 80, '⚡');
        if (this.combo >= 7) this._spawnEmote(b.x, b.y - 80, '💎');
      }
    }

    // ---------- Чекпоинты ----------
    for (const cp of this.checkpoints) {
      if (!cp.passed && b.x > cp.x) {
        cp.passed = true;
        this._spawnEmote(b.x, b.y - 100, '🚩');
      }
    }

    // ---------- Птицы ----------
    for (const bd of this.birds) {
      bd.x -= bd.speed * dt;
      bd.phase += dt * 4;
      if (bd.x < this.camera.x - 200) bd.x += 1500;
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

    // ---------- Смайлики ----------
    for (let i = this.emotes.length - 1; i >= 0; i--) {
      const e = this.emotes[i];
      e.y -= 60 * dt;
      e.life -= dt;
      if (e.life <= 0) this.emotes.splice(i, 1);
    }

    // ---------- Победа/поражение ----------
    if (b.x >= this.finishX) this.win();
    if (b.y > this.world.height + 400) this.lose();
  }

  _spawnEmote(x, y, emoji) {
    this.emotes.push({ x, y, emoji, life: 1.2 });
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
    if (p > 0.2 && p < 0.4) { skyTop = '#b8a8d8'; skyMid = '#e0d0f0'; skyBot = '#fff0f8'; }
    else if (p > 0.4 && p < 0.6) { skyTop = '#f0b880'; skyMid = '#ffd8a0'; skyBot = '#fff0d0'; }
    else if (p > 0.6 && p < 0.8) { skyTop = '#a0c0e0'; skyMid = '#d0e0f0'; skyBot = '#f0f8ff'; }
    else if (p >= 0.8) { skyTop = '#5a3a6a'; skyMid = '#a870a0'; skyBot = '#e8a0b0'; }

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(0.6, skyMid);
    grad.addColorStop(1, skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Солнце/луна
    ctx.fillStyle = p >= 0.8 ? '#fff0d0' : 'rgba(255, 240, 180, 0.85)';
    ctx.beginPath();
    ctx.arc(canvas.width - 90, 90, 55, 0, Math.PI * 2);
    ctx.fill();

    // Облака
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

    // Следы шин
    for (const tr of this.tracks) {
      if (tr.x < camX - 50 || tr.x > camX + canvas.width + 50) continue;
      ctx.globalAlpha = Math.min(0.5, tr.life * 0.3);
      ctx.fillStyle = '#3a2e1f';
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Звёзды
    const t = performance.now() / 1000;
    for (const s of this.stars) {
      if (s.taken) continue;
      if (s.x < camX - 100 || s.x > camX + canvas.width + 100) continue;
      const dy = Math.sin(t * 3 + s.phase) * 5;
      ctx.font = s.high ? '42px serif' : '32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', s.x, s.y + dy);
    }

    // Чекпоинты
    for (const cp of this.checkpoints) {
      if (cp.x < camX - 100 || cp.x > camX + canvas.width + 100) continue;
      if (cp.passed) continue;
      ctx.font = '40px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const gy = this._groundAt(cp.x);
      ctx.fillText('🚩', cp.x, gy - 60);
    }

    // Финиш
    if (this.finishX > camX - 200 && this.finishX < camX + canvas.width + 200) {
      ctx.fillStyle = '#c75a5a';
      ctx.fillRect(this.finishX - 4, 0, 8, canvas.height);
      ctx.font = 'bold 70px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏁', this.finishX, canvas.height * 0.3);
    }

    // Птицы
    for (const bd of this.birds) {
      if (bd.x < camX - 100 || bd.x > camX + canvas.width + 100) continue;
      const flap = Math.sin(bd.phase) > 0 ? '🐦' : '🐤';
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.fillText(flap, bd.x, bd.y);
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

    // Смайлики-эмоции
    for (const e of this.emotes) {
      ctx.globalAlpha = Math.min(1, e.life);
      ctx.font = '44px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.emoji, e.x, e.y);
    }
    ctx.globalAlpha = 1;

    // ---------- ТЕНЬ (СНАРУЖИ трансформации!) ----------
    const b = this.bike;
    const gy = this._groundAt(b.x);
    const shadowDist = Math.max(0, gy - b.y - 20);
    const shadowAlpha = Math.max(0, 0.35 - shadowDist * 0.002);
    if (shadowAlpha > 0 && b.onGround) {
      ctx.save();
      ctx.translate(b.x, gy - 5);
      ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 55, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ---------- МОТОЦИКЛ ----------
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    const bw = 130, bh = 70;
    if (this.sprite) {
      ctx.drawImage(this.sprite, -bw / 2, -bh / 2, bw, bh);
    } else {
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

      // Колёса
      const rotation = b.x * 0.05;
      for (const wx of [wBackX, wFrontX]) {
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(wx, wY, wr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.arc(wx, wY, wr * 0.65, 0, Math.PI * 2);
        ctx.fill();
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

    // Персонаж
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

    // Комбо
    if (this.combo > 1) {
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#c75a5a';
      ctx.fillText(`🔥 x${this.combo}`, 20, 80);
    }

    // Прогресс
    const progressBar = Math.min(1, this.bike.x / this.finishX);
    const barW = canvas.width - 40;
    ctx.fillStyle = 'rgba(58, 46, 31, 0.15)';
    ctx.beginPath();
    ctx.roundRect(20, 105, barW, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#e8b84b';
    ctx.beginPath();
    ctx.roundRect(20, 105, barW * progressBar, 12, 6);
    ctx.fill();

    // Оверлеи
    if (this.state === 'win') {
      ctx.fillStyle = 'rgba(58, 46, 31, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e8b84b';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏆 ПОБЕДА!', canvas.width / 2, canvas.height / 2 - 100);
      ctx.fillStyle = '#fdf6e3';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`⭐ ${this.collected} / ${this.totalStars}`, canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillText(`🔥 Макс комбо: ${this.maxCombo}`, canvas.width / 2, canvas.height / 2 + 30);
      ctx.fillText(`⏱ ${min}:${String(sec).padStart(2, '0')}`, canvas.width / 2, canvas.height / 2 + 70);
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
