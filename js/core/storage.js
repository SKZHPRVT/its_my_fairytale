// ============================================
// STORAGE — localStorage + IndexedDB (гибрид)
// Если IDB недоступен — fallback на localStorage
// ============================================

const LS_PREFIX = 'imf_';
const IDB_NAME = 'imf_db';
const IDB_VERSION = 3;   // ← увеличили
const IDB_STORE_DRAWINGS = 'drawings';
const IDB_STORE_DATA = 'data';

let _dbPromise = null;
let _idbBroken = false;  // флаг — если IDB окончательно сломан

// ---------- Открытие БД с самовосстановлением ----------
function openDB() {
  if (_idbBroken) return Promise.reject(new Error('IDB отключён'));
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(IDB_NAME, IDB_VERSION);
    } catch (e) {
      console.error('[Storage] IDB open threw:', e);
      _idbBroken = true;
      return reject(e);
    }

    req.onupgradeneeded = (e) => {
      console.log('[Storage] IDB upgrade:', e.oldVersion, '→', e.newVersion);
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_DRAWINGS)) {
        db.createObjectStore(IDB_STORE_DRAWINGS);
      }
      if (!db.objectStoreNames.contains(IDB_STORE_DATA)) {
        db.createObjectStore(IDB_STORE_DATA);
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      console.log('[Storage] IDB OK, version:', db.version, 'stores:', [...db.objectStoreNames]);

      // Проверка: все ли stores есть
      const missing = [];
      if (!db.objectStoreNames.contains(IDB_STORE_DRAWINGS)) missing.push(IDB_STORE_DRAWINGS);
      if (!db.objectStoreNames.contains(IDB_STORE_DATA)) missing.push(IDB_STORE_DATA);

      if (missing.length > 0) {
        console.warn('[Storage] IDB: нет stores', missing, '→ удаляем и пересоздаём');
        db.close();
        _dbPromise = null;
        const delReq = indexedDB.deleteDatabase(IDB_NAME);
        delReq.onsuccess = () => {
          console.log('[Storage] IDB удалён, пересоздаём');
          openDB().then(resolve).catch(reject);
        };
        delReq.onerror = () => { _idbBroken = true; reject(delReq.error); };
        delReq.onblocked = () => { console.warn('[Storage] IDB delete blocked'); };
        return;
      }

      resolve(db);
    };

    req.onerror = () => {
      console.error('[Storage] IDB open error:', req.error);
      _idbBroken = true;
      reject(req.error);
    };

    req.onblocked = () => {
      console.warn('[Storage] IDB open blocked — закрыть другие вкладки');
    };
  });

  return _dbPromise;
}

// ---------- localStorage helpers ----------
function lsSave(key, value) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('[Storage] LS save error:', e);
    return false;
  }
}

function lsLoad(key, fallback = null) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('[Storage] LS load error:', e);
    return fallback;
  }
}

function lsRemove(key) {
  try { localStorage.removeItem(LS_PREFIX + key); } catch (e) {}
}

// ---------- Публичный API ----------
export const Storage = {
  // === localStorage (синхронно) ===
  save(key, value) { return lsSave(key, value); },
  load(key, fallback) { return lsLoad(key, fallback); },
  remove(key) { lsRemove(key); },

  // === IndexedDB с fallback ===

  async saveDrawing(key, data) {
    if (!_idbBroken) {
      try {
        const db = await openDB();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(IDB_STORE_DRAWINGS, 'readwrite');
          tx.objectStore(IDB_STORE_DRAWINGS).put(data, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
        console.log('[Storage] saveDrawing в IDB:', key);
        return true;
      } catch (e) {
        console.warn('[Storage] IDB saveDrawing упал, fallback в LS:', e);
      }
    }

    // Fallback в localStorage
    console.log('[Storage] saveDrawing в LS:', key);
    return lsSave('drawing_' + key, data);
  },

  async loadDrawing(key) {
    if (!_idbBroken) {
      try {
        const db = await openDB();
        const data = await new Promise((resolve, reject) => {
          const tx = db.transaction(IDB_STORE_DRAWINGS, 'readonly');
          const req = tx.objectStore(IDB_STORE_DRAWINGS).get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
        if (data) {
          console.log('[Storage] loadDrawing из IDB:', key);
          return data;
        }
      } catch (e) {
        console.warn('[Storage] IDB loadDrawing упал, fallback в LS:', e);
      }
    }

    // Fallback
    const data = lsLoad('drawing_' + key);
    if (data) console.log('[Storage] loadDrawing из LS:', key);
    return data;
  },

  async saveData(key, value) {
    if (!_idbBroken) {
      try {
        const db = await openDB();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(IDB_STORE_DATA, 'readwrite');
          tx.objectStore(IDB_STORE_DATA).put(value, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
        console.log('[Storage] saveData в IDB:', key);
        return true;
      } catch (e) {
        console.warn('[Storage] IDB saveData упал, fallback в LS:', e);
      }
    }

    console.log('[Storage] saveData в LS:', key);
    return lsSave('data_' + key, value);
  },

  async loadData(key) {
    if (!_idbBroken) {
      try {
        const db = await openDB();
        const data = await new Promise((resolve, reject) => {
          const tx = db.transaction(IDB_STORE_DATA, 'readonly');
          const req = tx.objectStore(IDB_STORE_DATA).get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
        if (data) {
          console.log('[Storage] loadData из IDB:', key);
          return data;
        }
      } catch (e) {
        console.warn('[Storage] IDB loadData упал, fallback в LS:', e);
      }
    }

    const data = lsLoad('data_' + key);
    if (data) console.log('[Storage] loadData из LS:', key);
    return data;
  },
};
