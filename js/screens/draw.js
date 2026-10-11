// ============================================
// DRAW SCREEN — холст для рисования
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { DrawCanvas } from '../drawing/canvas.js';
import { PALETTE, SIZES } from '../drawing/tools.js';
import { saveDrawing } from '../drawing/export.js';
import { Toast } from '../ui/toast.js';

export function DrawScreen(root, params = {}) {
  const {
    assetKey = 'free_draw',
    onDone,
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
      <button class="draw-tool active" data-tool="brush">✏️</button>
      <button class="draw-tool" data-tool="eraser">🧽</button>
      <button class="draw-tool" id="btn-clear">🗑️</button>
      <div id="palette" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
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
    size: 4,
  });

  // Палитра
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

  // Инструменты
  screen.querySelectorAll('.draw-tool[data-tool]').forEach(btn => {
    btn.onclick = () => {
      screen.querySelectorAll('.draw-tool').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      drawCanvas.setTool(btn.dataset.tool);
    };
  });

  screen.querySelector('#btn-clear').onclick = () => drawCanvas.clear();

  screen.querySelector('#btn-back').onclick = () => {
    // Отменяем отложенный переход
    State.stories.pendingChapter = null;
    Router.go('story', { storyId: State.stories.currentStoryId || 'prince_and_dragon' });
  };

  screen.querySelector('#btn-done').onclick = async () => {
    try {
      const result = await saveDrawing(drawCanvas.canvas, assetKey, {
        removeWhite: !freeMode,
        tolerance: 30,
      });
      Toast.show('Рисунок сохранён!');

      // Сохраняем рисунок в State (для быстрого доступа)
      State.drawings[assetKey] = result;

      if (onDone) {
        // Вызываем callback (для story.js)
        onDone(result);
      } else {
        // Свободный режим — просто возвращаемся в меню
        Router.go('menu');
      }
    } catch (e) {
      console.error('[Draw] Ошибка сохранения:', e);
      Toast.show('Ошибка сохранения: ' + e.message);
    }
  };

  return () => drawCanvas.destroy();
}
