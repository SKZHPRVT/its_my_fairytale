// ============================================
// MINIGAME SCREEN — обёртка для мини-игр
// ============================================

import { Router } from '../core/router.js';

export async function MinigameScreen(root, params = {}) {
  const { minigame, onWin, onLose } = params;

  const screen = document.createElement('div');
  screen.className = 'screen minigame-screen';

  screen.innerHTML = `
    <div class="minigame-canvas-wrap" id="mg-wrap">
      <canvas id="mg-canvas"></canvas>
    </div>
    <div class="minigame-controls">
      <button class="ctrl-btn" id="ctrl-left">◀</button>
      <button class="ctrl-btn" id="ctrl-right">▶</button>
    </div>
  `;

  root.appendChild(screen);

  const wrap = screen.querySelector('#mg-wrap');
  const canvas = screen.querySelector('#mg-canvas');

  // Canvas растягивается на весь wrap
  const resize = () => {
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  // Выбор класса мини-игры
  let GameClass;
  try {
    switch (minigame.type) {
      case 'gravity':    GameClass = (await import('../minigames/gravity.js')).GravityGame; break;
      case 'physics':    GameClass = (await import('../minigames/physics.js')).PhysicsGame; break;
      case 'fighting':   GameClass = (await import('../minigames/fighting.js')).FightingGame; break;
      case 'puzzle':     GameClass = (await import('../minigames/puzzle.js')).PuzzleGame; break;
      case 'platformer': GameClass = (await import('../minigames/platformer.js')).PlatformerGame; break;
      case 'racing':     GameClass = (await import('../minigames/racing.js')).RacingGame; break;
      default:
        screen.innerHTML = `<div class="card">Неизвестная мини-игра: ${minigame.type}</div>`;
        return;
    }
  } catch (e) {
    console.error('[Minigame] Ошибка загрузки:', e);
    screen.innerHTML = `<div class="card">Ошибка: ${e.message}</div>`;
    return;
  }

  const game = new GameClass(canvas, minigame);
  await game.init();

  game.onWin(() => {
    setTimeout(() => onWin?.(), 800);
  });
  game.onLose(() => {
    setTimeout(() => onLose?.(), 800);
  });

  game.start();

  // Управление
  const leftBtn = screen.querySelector('#ctrl-left');
  const rightBtn = screen.querySelector('#ctrl-right');

  const setInput = (key, value) => {
    if (game.input) game.input[key] = value;
  };

  leftBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setInput('brake', true); });
  leftBtn.addEventListener('pointerup',   () => setInput('brake', false));
  leftBtn.addEventListener('pointerleave',() => setInput('brake', false));
  leftBtn.addEventListener('pointercancel',() => setInput('brake', false));

  rightBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setInput('gas', true); });
  rightBtn.addEventListener('pointerup',   () => setInput('gas', false));
  rightBtn.addEventListener('pointerleave',() => setInput('gas', false));
  rightBtn.addEventListener('pointercancel',() => setInput('gas', false));

  return () => {
    window.removeEventListener('resize', resize);
    game.destroy();
  };
}
