// ============================================
// DRAW SCREEN — холст для рисования
// С выбором размера кисти
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { DrawCanvas } from '../drawing/canvas.js';
import { PALETTE, SIZES, BRUSH_SIZE } from '../drawing/tools.js';
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
      <div id="palette" style="display:flex;gap:6px;flex-wrap:wrap;flex:1;"></div>
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
    size: BRUSH_SIZE,
  });

  // Палитра
  const paletteEl = screen.querySelector('#palette');
  PALETTE.forEach((color, i) => {
    const sw = document.createElement('button');
    sw.className = 'color-swatch' + (i === 0 ? ' selected' : '');
    sw.style.width = '36px';
    sw.style.height = '36px';
    sw.style.background = color;
    sw.style.borderRadius = '50%';
    sw.style.border = i === 0 ? '3px solid #3a2e1f' : '3px solid transparent';
    sw.onclick = () => {
      drawCanvas.setColor(color);
      paletteEl.querySelectorAll('.color-swatch').forEach(s => s.style.border = '3px solid transparent');
      sw.style.border = '3px solid #3a2e1f';
    };
    paletteEl.appendChild(sw);
  });

  // Размеры кисти
  const sizesEl = screen.querySelector('#sizes');
  SIZES.forEach((size, i) => {
    const btn = document.createElement('button');
    btn.className = 'size-btn' + (size === BRUSH_SIZE ? ' selected' : '');
    btn.style.width = '44px';
    btn.style.height = '44px';
    btn.style.borderRadius = '50%';
    btn.style.background = size === BRUSH_SIZE ? '#e8b84b' : '#fdf6e3';
    btn.style.border = '2px solid #3a2e1f';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '0';
    btn.style.cursor = 'pointer';
    btn.style.touchAction = 'none';

    const dot = document.createElement('div');
    const dotSize = Math.min(size, 28);
    dot.style.width = dotSize + 'px';
    dot.style.height = dotSize + 'px';
    dot.style.borderRadius = '50%';
    dot.style.background = '#3a2e1f';
    btn.appendChild(dot);

    btn.onclick = () => {
      drawCanvas.setSize(size);
      sizesEl.querySelectorAll('.size-btn').forEach(b => {
        b.style.background = '#fdf6e3';
        b.classList.remove('selected');
      });
      btn.style.background = '#e8b84b';
      btn.classList.add('selected');
    };
    sizesEl.appendChild(btn);
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
    State.drawReturnTo = null;

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
      console.log('[Draw] Сохранено:', result);
      console.log('[Draw] assetKey:', assetKey);
      Toast.show('Рисунок сохранён!');

      State.drawings[assetKey] = result;

      const returnTo = State.drawReturnTo;
      State.drawReturnTo = null;
      console.log('[Draw] returnTo:', returnTo);

      if (returnTo && returnTo.screen === 'avatar') {
        console.log('[Draw] Возврат в avatar');
        Router.go('avatar');
      } else if (returnTo && returnTo.screen === 'story') {
        Router.go('story', { storyId: State.stories.currentStoryId || 'prince_and_dragon' });
      } else {
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
