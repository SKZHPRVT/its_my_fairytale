// ============================================
// STATE — глобальное состояние приложения
// ============================================

export const State = {
  // Текущий экран
  screen: 'menu',

  // Игрок
  player: {
    name: null,
    avatar: null,        // { body, head, color }
    inventory: [],       // [{ id, name, emoji, power }]
    level: 1,
    xp: 0,
    achievements: [],
  },

  // Прогресс по сказкам
  stories: {
    unlocked: [],
    completed: {},       // { storyId: ['ending_a', 'ending_b'] }
    currentChapter: null,
  },

  // Текущие рисунки (в памяти, но сохраняются в IndexedDB)
  drawings: {},          // { key: { dataURL, width, height } }

  // Слушатели
  _listeners: {},

  // Подписка на изменения
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  },

  off(event, cb) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(fn => fn !== cb);
  },

  emit(event, data) {
    (this._listeners[event] || []).forEach(cb => cb(data));
  },

  // Обновление с событием
  set(path, value) {
    const keys = path.split('.');
    let obj = this;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
    this.emit('change:' + path, value);
    this.emit('change', { path, value });
  },
};
