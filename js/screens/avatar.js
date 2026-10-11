// ============================================
// AVATAR SCREEN — создание персонажа
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { Storage } from '../core/storage.js';
import { Avatar } from '../player/avatar.js';
import { PALETTE } from '../drawing/tools.js';
import { Toast } from '../ui/toast.js';

export function AvatarScreen(root) {
  const screen = document.createElement('div');
  screen.className = 'screen avatar-screen';

  screen.innerHTML = `
    <div class="screen-header">
      <button class="btn btn-ghost" id="btn-back">←</button>
      <div class="screen-title">Создай персонажа</div>
    </div>
    <div class="screen-body">
      <div class="avatar-preview">
        <canvas id="avatar-canvas" width="300" height="300"></canvas>
      </div>
      <div class="color-picker" id="color-picker"></div>
    </div>
    <div class="screen-footer">
      <button class="btn btn-block" id="btn-save">Готово</button>
    </div>
  `;

  root.appendChild(screen);

  const canvas = screen.querySelector('#avatar-canvas');
  const ctx = canvas.getContext('2d');

  let avatar = new Avatar(State.player.avatar || { color: PALETTE[0] });

  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    avatar.render(ctx, canvas.width / 2, canvas.height / 2 + 20, 1.5);
  };

  // Палитра
  const picker = screen.querySelector('#color-picker');
  PALETTE.forEach(color => {
    const sw = document.createElement('button');
    sw.className = 'color-swatch' + (color === avatar.color ? ' selected' : '');
    sw.style.background = color;
    sw.onclick = () => {
      avatar.color = color;
      picker.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('selected'));
      sw.classList.add('selected');
      render();
    };
    picker.appendChild(sw);
  });

  render();

  screen.querySelector('#btn-back').onclick = () => Router.back();
  screen.querySelector('#btn-save').onclick = () => {
    State.player.avatar = avatar.serialize();
    Storage.save('avatar', State.player.avatar);
    Toast.show('Персонаж сохранён!');
    Router.go('menu');
  };

  return () => {};
}
