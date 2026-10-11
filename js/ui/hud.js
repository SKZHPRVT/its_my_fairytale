// ============================================
// HUD — HUD для мини-игр
// ============================================

export function createHUD() {
  const hud = document.createElement('div');
  hud.className = 'minigame-hud';
  return hud;
}

export function createHUDItem(text) {
  const el = document.createElement('div');
  el.className = 'hud-item';
  el.textContent = text;
  return el;
}
