// ============================================
// EXPORT — сохранение рисунков + удаление белого фона
// ============================================

import { Storage } from '../core/storage.js';

// Убрать белый фон
export function removeWhiteBackground(dataURL, tolerance = 30) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, c.width, c.height);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance) {
          d[i + 3] = 0;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = dataURL;
  });
}

// Обрезать картинку в квадрат (для головы аватара)
export function cropToSquare(dataURL, size = 256) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');

      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}

// Загрузить картинку как HTMLImageElement
export function loadImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

// Сохранить рисунок
export async function saveDrawing(canvas, key, options = {}) {
  const raw = canvas.toDataURL('image/png');
  const dataURL = options.removeWhite
    ? await removeWhiteBackground(raw, options.tolerance || 30)
    : raw;

  const img = new Image();
  await new Promise(r => { img.onload = r; img.src = dataURL; });

  const data = {
    dataURL,
    width: img.width,
    height: img.height,
    createdAt: Date.now(),
  };

  await Storage.saveDrawing(key, data);
  return { key, ...data };
}

export async function loadDrawing(key) {
  return await Storage.loadDrawing(key);
}
