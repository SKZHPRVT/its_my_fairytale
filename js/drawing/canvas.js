// ============================================
// CANVAS — холст для рисования
// ============================================

export class DrawCanvas {
  constructor(container, options = {}) {
    this.container = container;
    this.width = options.width || 600;
    this.height = options.height || 600;
    this.color = options.color || '#3a2e1f';
    this.size = options.size || 4;
    this.tool = 'brush'; // 'brush' | 'eraser'

    this._createDOM();
    this._bindEvents();
    this._resize();
  }

  _createDOM() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Белый фон
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.container.appendChild(this.canvas);
  }

  _bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches?.[0] || e;
      return {
        x: (touch.clientX - rect.left) * (this.width / rect.width),
        y: (touch.clientY - rect.top)  * (this.height / rect.height),
      };
    };

    let drawing = false;

    const start = (e) => {
      e.preventDefault();
      drawing = true;
      const { x, y } = getPos(e);
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this._last = { x, y };
    };

    const move = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      this.ctx.strokeStyle = this.tool === 'eraser' ? '#ffffff' : this.color;
      this.ctx.lineWidth = this.tool === 'eraser' ? this.size * 3 : this.size;
      this.ctx.beginPath();
      this.ctx.moveTo(this._last.x, this._last.y);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this._last = { x, y };
    };

    const end = (e) => {
      if (!drawing) return;
      drawing = false;
    };

    // Мышь
    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    // Тач
    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove',  move,  { passive: false });
    this.canvas.addEventListener('touchend',   end);
  }

  _resize() {
    // Адаптация под контейнер
    const rect = this.container.getBoundingClientRect();
    if (rect.width > 0) {
      this.canvas.style.width  = '100%';
      this.canvas.style.height = '100%';
    }
  }

  setColor(color) { this.color = color; }
  setSize(size)   { this.size = size; }
  setTool(tool)   { this.tool = tool; }

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
