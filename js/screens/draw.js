// ============================================
// DRAW SCREEN — холст для рисования
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { DrawCanvas } from '../drawing/canvas.js';
import { PALETTE } from '../drawing/tools.js';
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
    // Размер берётся из BRUSH_SIZE в tools.js
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
