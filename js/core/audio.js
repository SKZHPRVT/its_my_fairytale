// ============================================
// AUDIO — звуки (заглушка, расширим позже)
// ============================================

export const Audio = {
  enabled: true,
  _cache: {},

  async play(name) {
    if (!this.enabled) return;
    try {
      // Позже: загрузка из assets/sounds/
      // Сейчас — просто заглушка
      console.log('[Audio] play:', name);
    } catch (e) {
      console.warn('[Audio] error', e);
    }
  },

  click() { this.play('click'); },
  step()  { this.play('step'); },
  magic() { this.play('magic'); },
};
