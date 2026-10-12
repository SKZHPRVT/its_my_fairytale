// ============================================
// STORAGE — localStorage only (без IndexedDB)
// Работает для небольших данных (сжатых фото)
// ============================================

const LS_PREFIX = 'imf_';

export const Storage = {
  // ---------- localStorage ----------
  save(key, value) {
    try {
      const json = JSON.stringify(value);
      localStorage.setItem(LS_PREFIX + key, json);
      console.log('[Storage] save OK:', key, '(' + json.length + ' символов)');
      return true;
    } catch (e) {
      console.error('[Storage] save error:', e);
      return false;
    }
  },

  load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[Storage] load error:', e);
      return fallback;
    }
  },

  remove(key) {
    try { localStorage.removeItem(LS_PREFIX + key); } catch (e) {}
  },

  // ---------- Заглушки для IndexedDB API (чтобы не падал код) ----------
  async saveDrawing(key, data) {
    // Сохраняем рисунки в localStorage тоже (сжатые)
    try {
      const json = JSON.stringify(data);
      if (json.length > 4 * 1024 * 1024) {
        console.warn('[Storage] Рисунок слишком большой для localStorage:', json.length);
        return false;
      }
      localStorage.setItem(LS_PREFIX + 'drawing_' + key, json);
      console.log('[Storage] saveDrawing OK:', key, '(' + json.length + ' символов)');
      return true;
    } catch (e) {
      console.error('[Storage] saveDrawing error:', e);
      return false;
    }
  },

  async loadDrawing(key) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + 'drawing_' + key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[Storage] loadDrawing error:', e);
      return null;
    }
  },

  async deleteDrawing(key) {
    try {
      localStorage.removeItem(LS_PREFIX + 'drawing_' + key);
      return true;
    } catch (e) {
      return false;
    }
  },

  async saveData(key, value) {
    return this.save('data_' + key, value);
  },

  async loadData(key) {
    return this.load('data_' + key);
  },

  async deleteData(key) {
    this.remove('data_' + key);
    return true;
  },
};
