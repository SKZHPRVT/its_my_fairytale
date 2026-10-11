// ============================================
// EVENTS — глобальная шина событий (pub/sub)
// ============================================

const listeners = new Map();

export const Events = {
  on(event, cb) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(cb);
    return () => Events.off(event, cb);
  },

  off(event, cb) {
    if (!listeners.has(event)) return;
    listeners.get(event).delete(cb);
  },

  emit(event, data) {
    if (!listeners.has(event)) return;
    listeners.get(event).forEach(cb => {
      try { cb(data); } catch (e) { console.error(e); }
    });
  },
};
