// ============================================
// STATE — глобальное состояние приложения
// ============================================

export const State = {
  screen: 'menu',

  player: {
    name: null,
    avatar: null,
    inventory: [],
    level: 1,
    xp: 0,
    achievements: [],
  },

  stories: {
    unlocked: [],
    completed: {},
    currentChapter: null,
    currentStoryId: null,
    pendingChapter: null,
  },

  drawings: {},

  // Куда вернуться после экрана рисования
  // { screen: 'avatar' | 'story', params: {...}, callback: fn }
  drawReturnTo: null,

  _listeners: {},

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

  set(path, value) {
    const keys = path.split('.');
    let obj = this;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
    this.emit('change:' + path, value);
    this.emit('change', { path, value });
  },
};
