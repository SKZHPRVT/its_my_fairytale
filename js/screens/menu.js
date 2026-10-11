// ============================================
// MENU SCREEN — главное меню
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';

export function MenuScreen(root) {
  const screen = document.createElement('div');
  screen.className = 'screen menu-screen';

  screen.innerHTML = `
    <div class="menu-title">🎨 Its My<br>Fairytale</div>
    <div class="menu-subtitle">Рисуй. Играй. Создавай миры.</div>
    <div class="menu-buttons">
      <button class="btn btn-block" id="btn-play">📖 Играть</button>
      <button class="btn btn-block btn-ghost" id="btn-avatar">👦 Мой персонаж</button>
      <button class="btn btn-block btn-ghost" id="btn-draw">🎨 Мастерская</button>
    </div>
  `;

  root.appendChild(screen);

  screen.querySelector('#btn-play').onclick   = () => Router.go('story', { storyId: 'prince_and_dragon' });
  screen.querySelector('#btn-avatar').onclick = () => Router.go('avatar');
  screen.querySelector('#btn-draw').onclick   = () => Router.go('draw', { freeMode: true });

  return () => {};
}
