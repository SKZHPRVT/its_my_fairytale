// ============================================
// DRAW SCREEN — холст для рисования
// Одна кисть 10 px
// ВАЖНО: НЕ обнуляем State.drawReturnTo — это делает avatar.js
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { DrawCanvas } from '../drawing/canvas.js';
import { PALETTE, BRUSH_SIZE } from '../drawing/tools.js';
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
      <div id="palette" style="display:flex;gap:6px;flex-wrap:wrap;flex:1;justify-content:flex-end;"></div>
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
    size: BRUSH_SIZE,
  });

  // Палитра
  const paletteEl = screen.querySelector('#palette');
  PALETTE.forEach((color, i) => {
    const sw = document.createElement('button');
    sw.className = 'color-swatch' + (i === 0 ? ' selected' : '');
    sw.style.width = '32px';
    sw.style.height = '32px';
    sw.style.background = color;
    sw.style.borderRadius = '50%';
    sw.style.border = i === 0 ? '3px solid #3a2e1f' : '3px solid transparent';
    sw.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
    sw.style.flexShrink = '0';
    sw.style.cursor = 'pointer';
    sw.style.touchAction = 'none';
    sw.onclick = () => {
      drawCanvas.setColor(color);
      paletteEl.querySelectorAll('.color-swatch').forEach(s => s.style.border = '3px solid transparent');
      sw.style.border = '3px solid #3a2e1f';
    };
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
  const goBack = () => {
    const returnTo = State.drawReturnTo;
    console.log('[Draw] Назад. returnTo =', returnTo);
    // НЕ обнуляем — avatar.js сам обнулит

    if (returnTo && returnTo.screen === 'avatar') {
      Router.go('avatar');
    } else if (returnTo && returnTo.screen === 'story') {
      Router.go('story', { storyId: State.stories.currentStoryId || 'prince_and_dragon' });
    } else {
      Router.back();
    }
  };

  screen.querySelector('#btn-back').onclick = goBack;

  // ---------- ГОТОВО ----------
  screen.querySelector('#btn-done').onclick = async () => {
    console.log('[Draw] === ГОТОВО ===');

    const btn = screen.querySelector('#btn-done');
    btn.textContent = 'Сохраняю...';
    btn.disabled = true;

    try {
      const result = await saveDrawing(drawCanvas.canvas, assetKey, {
        removeWhite: !freeMode,
        tolerance: 30,
      });
      console.log('[Draw] Сохранено, assetKey:', assetKey);
      Toast.show('Рисунок сохранён!');

      State.drawings[assetKey] = result;

      const returnTo = State.drawReturnTo;
      console.log('[Draw] returnTo =', returnTo);
      // НЕ обнуляем — avatar.js сам обнулит

      if (returnTo && returnTo.screen === 'avatar') {
        console.log('[Draw] → Router.go(avatar)');
        Router.go('avatar');
      } else if (returnTo && returnTo.screen === 'story') {
        console.log('[Draw] → Router.go(story)');
        Router.go('story', { storyId: State.stories.currentStoryId || 'prince_and_dragon' });
      } else {
        console.log('[Draw] → Router.go(menu)');
        Router.go('menu');
      }
    } catch (e) {
      console.error('[Draw] Ошибка:', e);
      Toast.show('Ошибка: ' + e.message);
      btn.textContent = 'Готово';
      btn.disabled = false;
    }
  };

  return () => {
    drawCanvas.destroy();
  };
}
