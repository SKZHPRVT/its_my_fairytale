// ============================================
// AVATAR SCREEN — создание персонажа
// Стикман + круглая голова + фото внутрь круга
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { Storage } from '../core/storage.js';
import { Avatar } from '../player/avatar.js';
import { Toast } from '../ui/toast.js';

// Палитра цветов тела
const BODY_COLORS = [
  '#3a2e1f',  // тёмно-коричневый
  '#c75a5a',  // красный
  '#5a8fc7',  // синий
  '#7ba05b',  // зелёный
  '#a05ac7',  // фиолетовый
  '#e8b84b',  // жёлтый
  '#000000',  // чёрный
];

// Палитра цвета головы (тон кожи)
const SKIN_COLORS = [
  '#f4d0a0',  // светлая
  '#e8b88a',  // средняя
  '#c78a5a',  // загорелая
  '#8a5a3a',  // тёмная
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
      <!-- Превью -->
      <div class="avatar-preview">
        <canvas id="avatar-canvas" width="400" height="400"></canvas>
      </div>

      <!-- Пол -->
      <div class="avatar-section">
        <div class="avatar-label">ПОЛ</div>
        <div class="avatar-row" id="gender-row">
          <button class="avatar-option selected" data-gender="boy">👦 Мальчик</button>
          <button class="avatar-option" data-gender="girl">👧 Девочка</button>
        </div>
      </div>

      <!-- Лицо -->
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

      <!-- Цвет тела -->
      <div class="avatar-section">
        <div class="avatar-label">ЦВЕТ ТЕЛА</div>
        <div class="avatar-colors" id="body-colors"></div>
      </div>

      <!-- Цвет головы -->
      <div class="avatar-section">
        <div class="avatar-label">ЦВЕТ ГОЛОВЫ</div>
        <div class="avatar-colors" id="skin-colors"></div>
      </div>
    </div>

    <div class="screen-footer">
      <button class="btn btn-block" id="btn-save">Готово ✓</button>
    </div>
  `;

  root.appendChild(screen);

  const canvas = screen.querySelector('#avatar-canvas');
  const ctx = canvas.getContext('2d');

  // Загружаем сохранённого аватара (если есть)
  const saved = State.player.avatar || {};
  let avatar = new Avatar(saved);

  // ---------- РЕНДЕР ПРЕВЬЮ ----------
  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Фон
    ctx.fillStyle = '#fdf6e3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Рисуем аватара по центру
    avatar.render(ctx, canvas.width / 2, canvas.height / 2 + 20, 1.6);
  };

  render();

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
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataURL = e.target.result;
      // Обрезаем и уменьшаем картинку до квадрата 256x256
      cropToSquare(dataURL, 256).then(squareURL => {
        avatar.setHeadImage(squareURL);
        render();
        Toast.show('Лицо добавлено!');
      });
    };
    reader.readAsDataURL(file);
  };

  screen.querySelector('#btn-camera').onclick = () => fileInputCamera.click();
  screen.querySelector('#btn-gallery').onclick = () => fileInput.click();
  screen.querySelector('#btn-draw-face').onclick = () => {
    // Переход на рисование лица (передаём callback)
    Router.go('draw', {
      assetKey: 'face_drawing',
      prompt: 'Нарисуй лицо',
      freeMode: false,
      onDone: async (result) => {
        if (result?.dataURL) {
          avatar.setHeadImage(result.dataURL);
          render();
          Toast.show('Лицо нарисовано!');
        }
      },
    });
  };

  screen.querySelector('#btn-clear-face').onclick = () => {
    avatar.setHeadImage(null);
    render();
    Toast.show('Лицо убрано');
  };

  fileInput.onchange = (e) => loadImageFile(e.target.files[0]);
  fileInputCamera.onchange = (e) => loadImageFile(e.target.files[0]);

  // ---------- ЦВЕТ ТЕЛА ----------
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

  // ---------- ЦВЕТ ГОЛОВЫ ----------
  const skinColors = screen.querySelector('#skin-colors');
  SKIN_COLORS.forEach(color => {
    const sw = document.createElement('button');
    sw.className = 'color-swatch' + (color === avatar.headColor ? ' selected' : '');
    sw.style.background = color;
    sw.onclick = () => {
      avatar.headColor = color;
      skinColors.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      render();
    };
    skinColors.appendChild(sw);
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

// ---------- Вспомогательная: обрезать картинку в квадрат ----------
function cropToSquare(dataURL, size) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');

      // Берём центральный квадрат
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      resolve(c.toDataURL('image/png'));
    };
    img.src = dataURL;
  });
}
