// ============================================
// DRAW SCREEN — холст для рисования
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { DrawCanvas } from '../drawing/canvas.js';
import { PALETTE, SIZES, DEFAULT_SIZE } from '../drawing/tools.js';
import { saveDrawing } from '../drawing/export.js';
import { Toast } from '../ui/toast.js';

export function DrawScreen(root, params = {}) {
  console.log('[Draw] Запуск. params:', params);

  const {
    assetKey = 'free_draw',
    freeMode = false,
    prompt = 'Нарисуй что-нибудь!',
  } = params;

  const screen = document.createElement('div');
  screen.className = 'screen draw-screen';

  screen.innerHTML = `
    <div class="screen-header">
      <button class="btn btn-ghost" id="btn-back">←</button>
      <div class="screen-title">${prompt}</div>
    </div>

    <div class="draw-toolbar">
      <button class="draw-tool active" data-tool="brush" title="Кисть">✏️</button>
      <button class="draw-tool" data-tool="eraser" title="Ластик">🧽</button>
      <button class="draw-tool" id="btn-clear" title="Очистить">🗑️</button>
      <div id="palette" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;"></div>
    </div>

    <div class="draw-sizes" id="sizes"></div>

    <div class="draw-canvas-wrap" id="canvas-wrap"></div>

    <div class="screen-footer">
      <button class="btn btn-block" id="btn-done">Готово</button>
    </div>
  `;

  root.appendChild(screen);

  const wrap = screen.querySelector('#canvas-wrap');
  const drawCanvas = new DrawCanvas(wrap, {
    width: 800,
    height: 800,
    color: PALETTE[0],
    size: DEFAULT_SIZE,
  });

  // ----- Палитра -----
  const paletteEl = screen.querySelector('#palette');
  PALETTE.forEach(color => {
    const sw = document.createElement('button');
    sw.className = 'color-swatch';
    sw.style.width = '32px';
    sw.style.height = '32px';
    sw.style.background = color;
    sw.onclick = () => drawCanvas.setColor(color);
    paletteEl.appendChild(sw);
  });

  // ----- Размеры кисти -----
  const sizesEl = screen.querySelector('#sizes');
  SIZES.forEach((size, idx) => {
    const btn = document.createElement('button');
    btn.className = 'size-btn' + (size === DEFAULT_SIZE ? ' active' : '');
    btn.dataset.size = size;
    btn.style.width = '48px';
    btn.style.height = '48px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.background = 'var(--bg-paper-dark)';
    btn.style.borderRadius = '8px';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';

    // Точка-индикатор размера
    const dot = document.createElement('div');
    const dotSize = Math.min(32, Math.max(6, size));
    dot.style.width = dotSize + 'px';
    dot.style.height = dotSize + 'px';
    dot.style.borderRadius = '50%';
    dot.style.background = 'var(--ink)';
    btn.appendChild(dot);

    btn.onclick = () => {
      sizesEl.querySelectorAll('.size-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'var(--bg-paper-dark)';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--accent-yellow)';
      drawCanvas.setSize(size);
      console.log('[Draw] Размер кисти:', size);
    };
    sizesEl.appendChild(btn);
  });
  // Подсветить активный сразу
  const activeSizeBtn = sizesEl.querySelector('.size-btn.active');
  if (activeSizeBtn) activeSizeBtn.style.background = 'var(--accent-yellow)';

  // ----- Инструменты -----
  screen.querySelectorAll('.draw-tool[data-tool]').forEach(btn => {
    btn.onclick = () => {
      screen.querySelectorAll('.draw-tool').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      drawCanvas.setTool(btn.dataset.tool);
    };
  });

  screen.querySelector('#btn-clear').onclick = () => drawCanvas.clear();

  // ----- Назад -----
  screen.querySelector('#btn-back').onclick = () => {
    const storyId = State.stories.currentStoryId || 'prince_and_dragon';
    Router.go('story', { storyId });
  };

  // ----- Готово -----
  screen.querySelector('#btn-done').onclick = async () => {
    const btn = screen.querySelector('#btn-done');
    btn.textContent = 'Сохраняю...';
    btn.disabled = true;

    try {
      const result = await saveDrawing(drawCanvas.canvas, assetKey, {
        removeWhite: !freeMode,
        tolerance: 30,
      });
      Toast.show('Рисунок сохранён!');
      State.drawings[assetKey] = result;

      const storyId = State.stories.currentStoryId || 'prince_and_dragon';
      Router.go('story', { storyId });
    } catch (e) {
      console.error('[Draw] Ошибка:', e);
      Toast.show('Ошибка: ' + e.message);
      btn.textContent = 'Готово';
      btn.disabled = false;
    }
  };

  return () => drawCanvas.destroy();
}
