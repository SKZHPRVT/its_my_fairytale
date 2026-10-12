// ============================================
// AVATAR SCREEN — создание персонажа
// С кроппером для фото
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { Storage } from '../core/storage.js';
import { Avatar } from '../player/avatar.js';
import { cropToSquare, loadDrawing } from '../drawing/export.js';
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
  console.log('[AvatarScreen] Запуск');
  console.log('[AvatarScreen] drawReturnTo:', State.drawReturnTo);

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

    <!-- КРОППЕР (скрыт, показываем при выборе фото) -->
    <div id="cropper-overlay" style="display:none; position:fixed; inset:0; background:#000; z-index:9000;">
      <div style="position:absolute; top:12px; left:0; right:0; text-align:center; color:#fff; font-family:sans-serif; font-size:14px; z-index:10;">
        Двигай фото · Масштабируй кнопками
      </div>
      <canvas id="cropper-canvas" style="display:block; width:100%; height:100%;"></canvas>
      <div style="position:absolute; bottom:16px; left:16px; right:16px; display:flex; gap:8px; z-index:10;">
        <button id="crop-cancel" style="flex:1; padding:14px; border-radius:12px; border:none; background:#444; color:#fff; font-size:16px;">Отмена</button>
        <button id="crop-zoom-out" style="width:56px; padding:14px; border-radius:12px; border:none; background:#e8b84b; color:#000; font-size:22px; font-weight:bold;">−</button>
        <button id="crop-zoom-in"  style="width:56px; padding:14px; border-radius:12px; border:none; background:#e8b84b; color:#000; font-size:22px; font-weight:bold;">+</button>
        <button id="crop-ok" style="flex:1; padding:14px; border-radius:12px; border:none; background:#7ba05b; color:#fff; font-size:16px; font-weight:bold;">Готово</button>
      </div>
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

  // ---------- ВОЗВРАТ ИЗ РИСОВАНИЯ ----------
  if (State.drawReturnTo && State.drawReturnTo.screen === 'avatar') {
    console.log('[AvatarScreen] Возврат из рисования — загружаю рисунок');
    State.drawReturnTo = null;
    setTimeout(async () => {
      const data = await loadDrawing('face_drawing');
      console.log('[AvatarScreen] loadDrawing(face_drawing):', data ? 'OK' : 'null');
      if (data && data.dataURL) {
        avatar.setHeadImage(data.dataURL, () => {
          console.log('[AvatarScreen] Рисунок применён');
          render();
        });
        Toast.show('Лицо нарисовано!');
      } else {
        Toast.show('Рисунок не найден');
      }
    }, 100);
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

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => openCropper(e.target.result);
    reader.readAsDataURL(file);
  };

  screen.querySelector('#btn-camera').onclick = () => fileInputCamera.click();
  screen.querySelector('#btn-gallery').onclick = () => fileInput.click();

  screen.querySelector('#btn-draw-face').onclick = () => {
    console.log('[AvatarScreen] → Рисование лица');
    State.drawReturnTo = { screen: 'avatar' };
    Router.go('draw', {
      assetKey: 'face_drawing',
      prompt: 'Нарисуй лицо',
      freeMode: true,
    });
  };

  screen.querySelector('#btn-clear-face').onclick = () => {
    avatar.setHeadImage(null, () => render());
    Toast.show('Лицо убрано');
  };

  fileInput.onchange = (e) => handleFile(e.target.files[0]);
  fileInputCamera.onchange = (e) => handleFile(e.target.files[0]);

  // ---------- КРОППЕР ----------
  const overlay = screen.querySelector('#cropper-overlay');
  const cropCanvas = screen.querySelector('#cropper-canvas');
  const cropCtx = cropCanvas.getContext('2d');

  let cropImage = null;
  let cropOffset = { x: 0, y: 0 };
  let cropScale = 1;
  let cropMinScale = 1;

  const resizeCropper = () => {
    cropCanvas.width = window.innerWidth;
    cropCanvas.height = window.innerHeight;
  };

  const openCropper = (dataURL) => {
    const img = new Image();
    img.onload = () => {
      cropImage = img;
      resizeCropper();

      // Начальный масштаб: чтобы картинка заполнила круг
      const circleR = Math.min(cropCanvas.width, cropCanvas.height) * 0.35;
      const fitScale = (circleR * 2) / Math.min(img.width, img.height);
      cropScale = fitScale;
      cropMinScale = fitScale * 0.5;

      cropOffset = { x: 0, y: 0 };
      overlay.style.display = 'block';
      drawCropper();
    };
    img.src = dataURL;
  };

  const drawCropper = () => {
    if (!cropImage) return;
    const w = cropCanvas.width;
    const h = cropCanvas.height;

    cropCtx.fillStyle = '#000';
    cropCtx.fillRect(0, 0, w, h);

    // Рисуем фото с учётом offset и scale
    const dw = cropImage.width * cropScale;
    const dh = cropImage.height * cropScale;
    const dx = w / 2 - dw / 2 + cropOffset.x;
    const dy = h / 2 - dh / 2 + cropOffset.y;

    cropCtx.drawImage(cropImage, dx, dy, dw, dh);

    // Затемнение снаружи круга
    const circleR = Math.min(w, h) * 0.35;
    const cx = w / 2;
    const cy = h / 2;

    cropCtx.save();
    cropCtx.fillStyle = 'rgba(0,0,0,0.6)';
    cropCtx.beginPath();
    cropCtx.rect(0, 0, w, h);
    cropCtx.arc(cx, cy, circleR, 0, Math.PI * 2, true);
    cropCtx.fill();
    cropCtx.restore();

    // Контур круга
    cropCtx.strokeStyle = '#e8b84b';
    cropCtx.lineWidth = 3;
    cropCtx.beginPath();
    cropCtx.arc(cx, cy, circleR, 0, Math.PI * 2);
    cropCtx.stroke();
  };

  // Drag
  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let offsetStart = { x: 0, y: 0 };

  const getPos = (e) => {
    const t = e.touches?.[0] || e;
    return { x: t.clientX, y: t.clientY };
  };

  cropCanvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    const p = getPos(e);
    dragStart = p;
    offsetStart = { ...cropOffset };
    cropCanvas.setPointerCapture?.(e.pointerId);
  });

  cropCanvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = getPos(e);
    cropOffset.x = offsetStart.x + (p.x - dragStart.x);
    cropOffset.y = offsetStart.y + (p.y - dragStart.y);
    drawCropper();
  });

  cropCanvas.addEventListener('pointerup', () => { dragging = false; });
  cropCanvas.addEventListener('pointercancel', () => { dragging = false; });

  // Zoom кнопки
  screen.querySelector('#crop-zoom-in').onclick = () => {
    cropScale *= 1.2;
    drawCropper();
  };
  screen.querySelector('#crop-zoom-out').onclick = () => {
    cropScale = Math.max(cropMinScale, cropScale / 1.2);
    drawCropper();
  };

  // Отмена
  screen.querySelector('#crop-cancel').onclick = () => {
    overlay.style.display = 'none';
    cropImage = null;
  };

  // Готово — обрезаем по кругу
  screen.querySelector('#crop-ok').onclick = () => {
    const w = cropCanvas.width;
    const h = cropCanvas.height;
    const circleR = Math.min(w, h) * 0.35;
    const cx = w / 2;
    const cy = h / 2;

    // Создаём canvas с квадратом 256x256
    const out = document.createElement('canvas');
    out.width = 256;
    out.height = 256;
    const outCtx = out.getContext('2d');

    // Круглая обрезка
    outCtx.save();
    outCtx.beginPath();
    outCtx.arc(128, 128, 128, 0, Math.PI * 2);
    outCtx.closePath();
    outCtx.clip();

    // Рисуем область из cropCanvas
    const sx = cx - circleR;
    const sy = cy - circleR;
    const sSize = circleR * 2;
    outCtx.drawImage(cropCanvas, sx, sy, sSize, sSize, 0, 0, 256, 256);
    outCtx.restore();

    const dataURL = out.toDataURL('image/png');
    avatar.setHeadImage(dataURL, () => {
      render();
      overlay.style.display = 'none';
      cropImage = null;
      Toast.show('Лицо добавлено!');
    });
  };

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
