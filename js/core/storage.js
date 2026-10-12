// ============================================
// STORAGE — localStorage + IndexedDB
// ============================================

const LS_PREFIX = 'imf_';
const IDB_NAME = 'imf_db';
const IDB_STORE_DRAWINGS = 'drawings';
const IDB_STORE_DATA = 'data';     // для аватара, инвентаря и т.д.
const IDB_VERSION = 1;

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_DRAWINGS)) {
        db.createObjectStore(IDB_STORE_DRAWINGS);
      }
      if (!db.objectStoreNames.contains(IDB_STORE_DATA)) {
        db.createObjectStore(IDB_STORE_DATA);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

export const Storage = {
  // ---------- localStorage ----------
  save(key, value) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Storage] localStorage save error:', e);
      return false;
    }
  },

  load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('[Storage] localStorage load error:', e);
      return fallback;
    }
  },

  remove(key) {
    localStorage.removeItem(LS_PREFIX + key);
  },

  // ---------- IndexedDB для рисунков ----------
  async saveDrawing(key, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_DRAWINGS, 'readwrite');
      tx.objectStore(IDB_STORE_DRAWINGS).put(data, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async loadDrawing(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_DRAWINGS, 'readonly');
      const req = tx.objectStore(IDB_STORE_DRAWINGS).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteDrawing(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_DRAWINGS, 'readwrite');
      tx.objectStore(IDB_STORE_DRAWINGS).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async listDrawings() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_DRAWINGS, 'readonly');
      const req = tx.objectStore(IDB_STORE_DRAWINGS).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // ---------- IndexedDB для больших данных (аватар и т.д.) ----------
  async saveData(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_DATA, 'readwrite');
      tx.objectStore(IDB_STORE_DATA).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async loadData(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_DATA, 'readonly');
      const req = tx.objectStore(IDB_STORE_DATA).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteData(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_DATA, 'readwrite');
      tx.objectStore(IDB_STORE_DATA).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
