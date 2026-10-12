// ============================================
// AVATAR SCREEN — создание персонажа
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { Storage } from '../core/storage.js';
import { Avatar } from '../player/avatar.js';
import { cropToSquare } from '../drawing/export.js';
import { Toast } from '../ui/toast.js';

const BODY_COLORS = [
  '#3a2e1f',
  '#000000',
  '#c75a5a',
  '#5a8fc7',
  '#7ba05b',
  '#a05ac7',
  '#e8b84b',
  '#f4d0a0',
];

export function AvatarScreen(root) {
  const screen = document.createElement('div');
  screen.className = 'screen avatar-screen';

  screen.innerHTML = `
    <div class="screen-header">
      <button class="btn btn-ghost" id="btn-back">←</button>
      <div class="screen-title">Мой персонаж</div>
    </div>

    <div class="screen-body">
      <div class="avatar-preview">
        <canvas id="avatar-canvas" width="400" height="400"></canvas>
      </div>

      <div class="avatar-section">
        <div class="avatar-label">ПОЛ</div>
        <div class="avatar-row" id="gender-row">
          <button class="avatar-option selected" data-gender="boy">👦 Мальчик</button>
          <button class="avatar-option" data-gender="girl">👧 Девочка</button>
        </div>
      </div>

      <div class="avatar-section">
        <div class="avatar-label">ЛИЦО</div>
        <div class="avatar-row" id="face-row">
          <button class="avatar-option" id="btn-camera">📷 Камера</button>
          <button class="avatar-option" id="btn-gallery">🖼 Галерея</button>
          <button class="avatar-option" id="btn-draw-face">🎨 Рисунок</button>
          <button class="avatar-option" id="btn-clear-face">✖ Убрать</button>
        </div>
        <input type="file" id="file-input" accept="image/*" style="display:none">
        <input type="file" id="file-input-camera" accept="image/*" capture="user" style="display:none">
      </div>

      <div class="avatar-section">
        <div class="avatar-label">ЦВЕТ</div>
        <div class="avatar-colors" id="body-colors"></div>
      </div>
    </div>

    <div class="screen-footer">
      <button class="btn btn-block" id="btn-save">Готово ✓</button>
    </div>
  `;

  root.appendChild(screen);

  const canvas = screen.querySelector('#avatar-canvas');
  const ctx = canvas.getContext('2d');

  const saved = State.player.avatar || {};
  let avatar = new Avatar(saved);

  // ---------- РЕНДЕР ----------
  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fdf6e3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    avatar.render(ctx, canvas.width / 2, canvas.height / 2 + 20, 1.6);
  };

  render();

  // ---------- ПРОВЕРКА: пришли ли с экрана рисунка ----------
  if (State.drawReturnTo && State.drawReturnTo.screen === 'avatar') {
    const callback = State.drawReturnTo.callback;
    State.drawReturnTo = null;
    // На следующем кадре (когда картинка уже сохранена) — применим
    setTimeout(() => {
      if (typeof callback === 'function') callback(avatar, render);
    }, 50);
  }

  // ---------- ПОЛ ----------
  const genderRow = screen.querySelector('#gender-row');
  genderRow.querySelectorAll('.avatar-option').forEach(btn => {
    if (btn.dataset.gender === avatar.gender) btn.classList.add('selected');
    else btn.classList.remove('selected');

    btn.onclick = () => {
      avatar.gender = btn.dataset.gender;
      genderRow.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      render();
    };
  });

  // ---------- ЛИЦО ----------
  const fileInput = screen.querySelector('#file-input');
  const fileInputCamera = screen.querySelector('#file-input-camera');

  const loadImageFile = (file) => {
    if (!file) return;
    console.log('[Avatar] Файл выбран:', file.name, file.size);
    const reader = new FileReader();
    reader.onload = async (e) => {
      console.log('[Avatar] Файл прочитан, длина DataURL:', e.target.result.length);
      try {
        const squareURL = await cropToSquare(e.target.result, 256);
        console.log('[Avatar] Обрезано в квадрат, длина:', squareURL.length);
        avatar.setHeadImage(squareURL, () => {
          console.log('[Avatar] Картинка загружена, рендер...');
          render();
        });
        Toast.show('Лицо добавлено!');
      } catch (err) {
        console.error('[Avatar] Ошибка обработки картинки:', err);
        Toast.show('Ошибка: ' + err.message);
      }
    };
    reader.onerror = (e) => {
      console.error('[Avatar] Ошибка чтения файла:', e);
      Toast.show('Не удалось прочитать файл');
    };
    reader.readAsDataURL(file);
  };

  screen.querySelector('#btn-camera').onclick = () => fileInputCamera.click();
  screen.querySelector('#btn-gallery').onclick = () => fileInput.click();

  screen.querySelector('#btn-draw-face').onclick = () => {
    console.log('[Avatar] → Рисование лица');
    // Запоминаем, куда вернуться
    State.drawReturnTo = {
      screen: 'avatar',
      callback: (av, renderFn) => {
        console.log('[Avatar] Callback из рисования вызван');
        // Загружаем рисунок из IndexedDB
        import('../drawing/export.js').then(async ({ loadDrawing }) => {
          const data = await loadDrawing('face_drawing');
          if (data && data.dataURL) {
            console.log('[Avatar] Рисунок загружен, применяем');
            av.setHeadImage(data.dataURL, () => {
              console.log('[Avatar] Рисунок применён, рендер...');
              renderFn();
            });
            Toast.show('Лицо нарисовано!');
          } else {
            console.warn('[Avatar] Рисунок не найден');
          }
        });
      },
    };
    Router.go('draw', {
      assetKey: 'face_drawing',
      prompt: 'Нарисуй лицо',
      freeMode: true,   // НЕ удаляем белый фон
    });
  };

  screen.querySelector('#btn-clear-face').onclick = () => {
    avatar.setHeadImage(null, () => render());
    Toast.show('Лицо убрано');
  };

  fileInput.onchange = (e) => loadImageFile(e.target.files[0]);
  fileInputCamera.onchange = (e) => loadImageFile(e.target.files[0]);

  // ---------- ЦВЕТ ----------
  const bodyColors = screen.querySelector('#body-colors');
  BODY_COLORS.forEach(color => {
    const sw = document.createElement('button');
    sw.className = 'color-swatch' + (color === avatar.color ? ' selected' : '');
    sw.style.background = color;
    sw.onclick = () => {
      avatar.color = color;
      bodyColors.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      render();
    };
    bodyColors.appendChild(sw);
  });

  // ---------- СОХРАНЕНИЕ ----------
  screen.querySelector('#btn-back').onclick = () => Router.back();

  screen.querySelector('#btn-save').onclick = () => {
    State.player.avatar = avatar.serialize();
    Storage.save('avatar', State.player.avatar);
    Toast.show('Персонаж сохранён!');
    Router.go('menu');
  };

  return () => {};
}
