// ============================================
// EXPORT — сохранение рисунков + удаление белого фона
// ============================================

import { Storage } from '../core/storage.js';

// Убрать белый фон (простой алгоритм)
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
          d[i + 3] = 0; // прозрачный
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = dataURL;
  });
}

// Сохранить рисунок в IndexedDB
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
