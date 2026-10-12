// ============================================
// CANVAS — холст для рисования
// Плавный drag
// ============================================

import { BRUSH_SIZE, ERASER_MULTIPLIER } from './tools.js';

export class DrawCanvas {
  constructor(container, options = {}) {
    this.container = container;
    this.width = options.width || 800;
    this.height = options.height || 800;
    this.color = options.color || '#3a2e1f';
    this.size = options.size || BRUSH_SIZE;
    this.tool = 'brush';

    this._createDOM();
    this._bindEvents();
  }

  _createDOM() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.container.appendChild(this.canvas);
  }

  _bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches?.[0] || e.changedTouches?.[0] || e;
      return {
        x: (touch.clientX - rect.left) * (this.width / rect.width),
        y: (touch.clientY - rect.top)  * (this.height / rect.height),
      };
    };

    let drawing = false;
    let pendingPos = null;
    let rafId = null;

    const flush = () => {
      rafId = null;
      if (!pendingPos || !this._last) return;
      this._drawLine(this._last.x, this._last.y, pendingPos.x, pendingPos.y);
      this._last = pendingPos;
      pendingPos = null;
    };

    const start = (e) => {
      e.preventDefault();
      drawing = true;
      const { x, y } = getPos(e);
      this._drawDot(x, y);
      this._last = { x, y };
      pendingPos = null;
    };

    const move = (e) => {
      if (!drawing) return;
      e.preventDefault();
      pendingPos = getPos(e);
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };

    const end = (e) => {
      if (!drawing) return;
      if (pendingPos) flush();
      drawing = false;
      this._last = null;
    };

    // Мышь
    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    // Тач
    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove',  move,  { passive: false });
    this.canvas.addEventListener('touchend',   end);
    this.canvas.addEventListener('touchcancel', end);
  }

  _applyStyle() {
    this.ctx.strokeStyle = this.tool === 'eraser' ? '#ffffff' : this.color;
    this.ctx.fillStyle   = this.tool === 'eraser' ? '#ffffff' : this.color;
    this.ctx.lineWidth = this.tool === 'eraser'
      ? this.size * ERASER_MULTIPLIER
      : this.size;
  }

  _drawDot(x, y) {
    this._applyStyle();
    const r = this.ctx.lineWidth / 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  _drawLine(x1, y1, x2, y2) {
    this._applyStyle();
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  setColor(color) { this.color = color; }
  setTool(tool)   { this.tool = tool; }
  setSize(size)   { this.size = size; }

  clear() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }

  destroy() {
    this.canvas.remove();
  }
}
