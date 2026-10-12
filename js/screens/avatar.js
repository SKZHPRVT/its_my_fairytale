// ============================================
// AVATAR SCREEN — создание персонажа
// Фото сжимается до 64x64 JPEG (~5 KB, влезает в localStorage)
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { Avatar } from '../player/avatar.js';
import { loadDrawing } from '../drawing/export.js';
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
  console.log('[Avatar] === ЗАПУСК ===');
  console.log('[Avatar] drawReturnTo:', State.drawReturnTo);

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

    <div id="cropper-overlay" style="display:none; position:fixed; inset:0; background:#000; z-index:9000;">
      <div style="position:absolute; top:calc(16px + env(safe-area-inset-top)); left:0; right:0; text-align:center; color:#fff; font-family:sans-serif; font-size:14px; z-index:10; padding:0 16px;">
        Двигай фото · Масштабируй кнопками
      </div>
      <canvas id="cropper-canvas" style="display:block; width:100%; height:100%;"></canvas>
      <div style="position:absolute; bottom:calc(16px + env(safe-area-inset-bottom)); left:16px; right:16px; display:flex; gap:8px; z-index:10;">
        <button id="crop-cancel" style="flex:1; padding:14px; border-radius:12px; border:none; background:#444; color:#fff; font-size:16px; cursor:pointer;">Отмена</button>
        <button id="crop-zoom-out" style="width:56px; padding:14px; border-radius:12px; border:none; background:#e8b84b; color:#000; font-size:22px; font-weight:bold; cursor:pointer;">−</button>
        <button id="crop-zoom-in"  style="width:56px; padding:14px; border-radius:12px; border:none; background:#e8b84b; color:#000; font-size:22px; font-weight:bold; cursor:pointer;">+</button>
        <button id="crop-ok" style="flex:1; padding:14px; border-radius:12px; border:none; background:#7ba05b; color:#fff; font-size:16px; font-weight:bold; cursor:pointer;">Готово</button>
      </div>
    </div>
  `;

  root.appendChild(screen);

  const canvas = screen.querySelector('#avatar-canvas');
  const ctx = canvas.getContext('2d');

  const saved = State.player.avatar || {};
  let avatar = new Avatar(saved);

  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fdf6e3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    avatar.render(ctx, canvas.width / 2, canvas.height / 2 + 20, 1.6);
  };

  render();

  // ---------- ВОЗВРАТ ИЗ РИСОВАНИЯ ----------
  const returnTo = State.drawReturnTo;
  State.drawReturnTo = null;

  if (returnTo && returnTo.screen === 'avatar') {
    console.log('[Avatar] Возврат из рисования');
    setTimeout(async () => {
      const data = await loadDrawing('face_drawing');
      console.log('[Avatar] loadDrawing вернул:', data ? 'OK' : 'null');
      if (data && data.dataURL) {
        avatar.setHeadImage(data.dataURL, () => {
          console.log('[Avatar] Рисунок применён');
          render();
          Toast.show('Лицо нарисовано!');
        });
      }
    }, 200);
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

    const dw = cropImage.width * cropScale;
    const dh = cropImage.height * cropScale;
    const dx = w / 2 - dw / 2 + cropOffset.x;
    const dy = h / 2 - dh / 2 + cropOffset.y;

    cropCtx.drawImage(cropImage, dx, dy, dw, dh);

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

    cropCtx.strokeStyle = '#e8b84b';
    cropCtx.lineWidth = 3;
    cropCtx.beginPath();
    cropCtx.arc(cx, cy, circleR, 0, Math.PI * 2);
    cropCtx.stroke();
  };

  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let offsetStart = { x: 0, y: 0 };
  let cropPending = false;

  const getPos = (e) => {
    const t = e.touches?.[0] || e;
    return { x: t.clientX, y: t.clientY };
  };

  const scheduleDraw = () => {
    if (cropPending) return;
    cropPending = true;
    requestAnimationFrame(() => {
      cropPending = false;
      drawCropper();
    });
  };

  cropCanvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragging = true;
    const p = getPos(e);
    dragStart = p;
    offsetStart = { ...cropOffset };
    try { cropCanvas.setPointerCapture(e.pointerId); } catch (_) {}
  });

  cropCanvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    e.preventDefault();
    const p = getPos(e);
    cropOffset.x = offsetStart.x + (p.x - dragStart.x);
    cropOffset.y = offsetStart.y + (p.y - dragStart.y);
    scheduleDraw();
  });

  cropCanvas.addEventListener('pointerup', () => { dragging = false; });
  cropCanvas.addEventListener('pointercancel', () => { dragging = false; });

  screen.querySelector('#crop-zoom-in').onclick = () => {
    cropScale *= 1.2;
    scheduleDraw();
  };
  screen.querySelector('#crop-zoom-out').onclick = () => {
    cropScale = Math.max(cropMinScale, cropScale / 1.2);
    scheduleDraw();
  };

  screen.querySelector('#crop-cancel').onclick = () => {
    overlay.style.display = 'none';
    cropImage = null;
  };

  // ВАЖНО: сжимаем до 64x64 JPEG (~5 KB)
  screen.querySelector('#crop-ok').onclick = () => {
    const w = cropCanvas.width;
    const h = cropCanvas.height;
    const circleR = Math.min(w, h) * 0.35;
    const cx = w / 2;
    const cy = h / 2;

    const out = document.createElement('canvas');
    out.width = 64;   // ← было 128
    out.height = 64;
    const outCtx = out.getContext('2d');

    outCtx.save();
    outCtx.beginPath();
    outCtx.arc(32, 32, 32, 0, Math.PI * 2);
    outCtx.closePath();
    outCtx.clip();

    const sx = cx - circleR;
    const sy = cy - circleR;
    const sSize = circleR * 2;
    outCtx.drawImage(cropCanvas, sx, sy, sSize, sSize, 0, 0, 64, 64);
    outCtx.restore();

    // JPEG 0.7 — максимальное сжатие
    const dataURL = out.toDataURL('image/jpeg', 0.7);
    console.log('[Avatar] Фото сжато, размер:', dataURL.length, 'символов (~' + Math.round(dataURL.length / 1024) + ' KB)');

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
    const config = avatar.serialize();
    console.log('[Avatar] Сохраняю, размер headImage:', config.headImage?.length || 0, 'символов');

    // Сохраняем в localStorage
    import('../core/storage.js').then(({ Storage }) => {
      const ok = Storage.save('avatar', config);
      console.log('[Avatar] Storage.save вернул:', ok);

      // Синхронизируем State
      State.player.avatar = config;

      if (ok) {
        Toast.show('Персонаж сохранён!');
        Router.go('menu');
      } else {
        Toast.show('Ошибка сохранения: хранилище переполнено');
      }
    });
  };

  return () => {};
}
