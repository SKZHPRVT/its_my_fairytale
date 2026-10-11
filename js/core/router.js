// ============================================
// ROUTER — переключение экранов
// ============================================

import { State } from './state.js';

// Реестр экранов: id -> функция рендера
const screens = new Map();
let currentScreen = null;
let currentCleanup = null;

export const Router = {
  // Регистрация экрана
  register(id, renderFn) {
    screens.set(id, renderFn);
  },

  // Перейти на экран
  go(id, params = {}) {
    if (!screens.has(id)) {
      console.error(`[Router] Экран "${id}" не зарегистрирован`);
      return;
    }

    // Очистка предыдущего
    if (currentCleanup) {
      try { currentCleanup(); } catch (e) { console.error(e); }
      currentCleanup = null;
    }

    currentScreen = id;
    State.screen = id;

    const root = document.getElementById('screen-root');
    root.innerHTML = '';

    const renderFn = screens.get(id);
    const result = renderFn(root, params);

    // Если экран вернул функцию очистки — сохраняем
    if (typeof result === 'function') {
      currentCleanup = result;
    }
  },

  back() {
    // Простой стек истории
    if (this._history && this._history.length > 1) {
      this._history.pop();
      const prev = this._history[this._history.length - 1];
      this.go(prev.id, prev.params);
    } else {
      this.go('menu');
    }
  },

  get current() { return currentScreen; },
};

// Инициализация истории
Router._history = [];
const _origGo = Router.go.bind(Router);
Router.go = function(id, params = {}) {
  Router._history.push({ id, params });
  if (Router._history.length > 20) Router._history.shift();
  _origGo(id, params);
};
