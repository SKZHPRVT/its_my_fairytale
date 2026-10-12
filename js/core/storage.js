// ============================================
// STORAGE — localStorage + IndexedDB
// С обработкой конфликта версий БД
// ============================================

const LS_PREFIX = 'imf_';
const IDB_NAME = 'imf_db';
const IDB_STORE_DRAWINGS = 'drawings';
const IDB_STORE_DATA = 'data';
const IDB_VERSION = 2;   // ← увеличили (было 1)

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    // Сначала попробуем удалить старую БД, если версия не совпадает
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);

    req.onupgradeneeded = (e) => {
      console.log('[Storage] IDB upgrade:', e.oldVersion, '→', e.newVersion);
      const db = req.result;

      // Создаём stores, если их нет
      if (!db.objectStoreNames.contains(IDB_STORE_DRAWINGS)) {
        db.createObjectStore(IDB_STORE_DRAWINGS);
      }
      if (!db.objectStoreNames.contains(IDB_STORE_DATA)) {
        db.createObjectStore(IDB_STORE_DATA);
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      console.log('[Storage] IDB открыт, version:', db.version, 'stores:', [...db.objectStoreNames]);

      // Проверяем, что оба store есть
      const missing = [];
      if (!db.objectStoreNames.contains(IDB_STORE_DRAWINGS)) missing.push(IDB_STORE_DRAWINGS);
      if (!db.objectStoreNames.contains(IDB_STORE_DATA)) missing.push(IDB_STORE_DATA);

      if (missing.length > 0) {
        console.warn('[Storage] IDB: отсутствуют stores', missing, '— удаляем БД и пересоздаём');
        db.close();
        _dbPromise = null;

        const delReq = indexedDB.deleteDatabase(IDB_NAME);
        delReq.onsuccess = () => {
          console.log('[Storage] IDB удалён, пересоздаём');
          openDB().then(resolve).catch(reject);
        };
        delReq.onerror = () => reject(delReq.error);
        return;
      }

      resolve(db);
    };

    req.onerror = () => {
      console.error('[Storage] IDB ошибка открытия:', req.error);
      reject(req.error);
    };

    req.onblocked = () => {
      console.warn('[Storage] IDB заблокирован — закройте другие вкладки');
    };
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
    try {
      localStorage.removeItem(LS_PREFIX + key);
    } catch (e) {}
  },

  // ---------- IndexedDB: рисунки ----------
  async saveDrawing(key, data) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_DRAWINGS, 'readwrite');
        tx.objectStore(IDB_STORE_DRAWINGS).put(data, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (e) {
      console.error('[Storage] saveDrawing error:', e);
      return false;
    }
  },

  async loadDrawing(key) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_DRAWINGS, 'readonly');
        const req = tx.objectStore(IDB_STORE_DRAWINGS).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('[Storage] loadDrawing error:', e);
      return null;
    }
  },

  async deleteDrawing(key) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_DRAWINGS, 'readwrite');
        tx.objectStore(IDB_STORE_DRAWINGS).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.error('[Storage] deleteDrawing error:', e);
      return false;
    }
  },

  // ---------- IndexedDB: данные (аватар, инвентарь и т.д.) ----------
  async saveData(key, value) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_DATA, 'readwrite');
        tx.objectStore(IDB_STORE_DATA).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (e) {
      console.error('[Storage] saveData error:', e);
      return false;
    }
  },

  async loadData(key) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_DATA, 'readonly');
        const req = tx.objectStore(IDB_STORE_DATA).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('[Storage] loadData error:', e);
      return null;
    }
  },

  async deleteData(key) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_DATA, 'readwrite');
        tx.objectStore(IDB_STORE_DATA).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.error('[Storage] deleteData error:', e);
      return false;
    }
  },
};
