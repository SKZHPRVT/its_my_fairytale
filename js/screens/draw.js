// ============================================
// DRAW SCREEN — холст для рисования
// Прямая навигация без callback (для надёжности)
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { DrawCanvas } from '../drawing/canvas.js';
import { PALETTE, SIZES } from '../drawing/tools.js';
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

  // ---------- НАЗАД ----------
  screen.querySelector('#btn-back').onclick = () => {
    console.log('[Draw] Назад');
    const storyId = State.stories.currentStoryId || 'prince_and_dragon';
    Router.go('story', { storyId });
  };

  // ---------- ГОТОВО ----------
  screen.querySelector('#btn-done').onclick = async () => {
    console.log('[Draw] === ГОТОВО ===');

    // Меняем текст кнопки, чтобы было видно, что идёт сохранение
    const btn = screen.querySelector('#btn-done');
    btn.textContent = 'Сохраняю...';
    btn.disabled = true;

    try {
      const result = await saveDrawing(drawCanvas.canvas, assetKey, {
        removeWhite: !freeMode,
        tolerance: 30,
      });
      console.log('[Draw] Сохранено:', result);
      Toast.show('Рисунок сохранён!');

      // Сохраняем в State
      State.drawings[assetKey] = result;

      // ---------- ПРЯМАЯ НАВИГАЦИЯ ----------
      // Не полагаемся на callback и pendingChapter.
      // Просто идём в сказку. story.js сам разберётся,
      // какая глава следующая.
      const storyId = State.stories.currentStoryId || 'prince_and_dragon';

      // Устанавливаем, какую главу рендерить
      if (State.stories.pendingChapter) {
        console.log('[Draw] pendingChapter:', State.stories.pendingChapter);
        // Оставляем как есть — story.js подхватит
      } else {
        // Если pendingChapter не установлен — 
        // просто возвращаемся к текущей главе
        console.log('[Draw] pendingChapter не установлен');
      }

      // Переходим в сказку
      console.log('[Draw] Переход в story, storyId =', storyId);
      Router.go('story', { storyId });

    } catch (e) {
      console.error('[Draw] Ошибка:', e);
      Toast.show('Ошибка: ' + e.message);
      btn.textContent = 'Готово';
      btn.disabled = false;
    }
  };

  return () => {
    console.log('[Draw] Cleanup');
    drawCanvas.destroy();
  };
}
