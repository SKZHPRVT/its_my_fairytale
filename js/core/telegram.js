// ============================================
// TELEGRAM — обёртка над WebApp SDK
// ============================================

export const Telegram = {
  app: null,
  user: null,
  isTelegram: false,

  init() {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      console.log('[Telegram] SDK не найден — работаем как обычный сайт');
      return;
    }

    this.app = tg;
    this.isTelegram = true;
    document.body.classList.add('is-telegram');

    tg.ready();
    tg.expand();   // разворачиваем на максимум

    try {
      tg.requestFullscreen?.();
    } catch (e) {
      console.log('[Telegram] Fullscreen не поддерживается');
    }

    try {
      tg.disableVerticalSwipes?.();
    } catch (e) {}

    try {
      this.user = tg.initDataUnsafe?.user || null;
    } catch (e) {
      console.warn('[Telegram] не удалось получить user', e);
    }

    this._applyTheme();

    console.log('[Telegram] Инициализирован', this.user);
  },

  _applyTheme() {
    const tg = this.app;
    if (!tg?.themeParams) return;
    const p = tg.themeParams;
    const root = document.documentElement;
    if (p.bg_color) root.style.setProperty('--tg-bg', p.bg_color);
    if (p.text_color) root.style.setProperty('--tg-text', p.text_color);
  },

  showMainButton(text, onClick) {
    if (!this.app) return;
    this.app.MainButton.setText(text);
    this.app.MainButton.show();
    this.app.MainButton.onClick(onClick);
  },

  hideMainButton() {
    if (!this.app) return;
    this.app.MainButton.hide();
  },

  haptic(type = 'light') {
    if (!this.app?.HapticFeedback) return;
    try {
      this.app.HapticFeedback.impactOccurred(type);
    } catch (e) {}
  },
};
