// ============================================
// MAIN — точка входа
// Аватар: сначала IDB, потом LS
// ============================================

import { State } from './core/state.js';
import { Router } from './core/router.js';
import { Storage } from './core/storage.js';
import { Telegram } from './core/telegram.js';
import { Inventory } from './player/inventory.js';
import { Progression } from './player/progression.js';
import { Toast } from './ui/toast.js';

import { MenuScreen } from './screens/menu.js';
import { AvatarScreen } from './screens/avatar.js';
import { DrawScreen } from './screens/draw.js';
import { StoryScreen } from './screens/story.js';
import { MinigameScreen } from './screens/minigame.js';

console.log('[Main] Загружен');

async function boot() {
  console.log('[Boot] Старт');

  try { Telegram.init(); } catch (e) {}
  try { Inventory.init(); } catch (e) {}
  try { Progression.init(); } catch (e) {}

  // Аватар — сначала из IDB, потом из LS
  try {
    let savedAvatar = null;

    // Пробуем IDB
    try {
      savedAvatar = await Storage.loadData('avatar');
    } catch (e) {
      console.warn('[Boot] IDB недоступен:', e);
    }

    // Fallback на LS
    if (!savedAvatar) {
      savedAvatar = Storage.load('avatar', null);
      if (savedAvatar) console.log('[Boot] Аватар из localStorage');
    } else {
      console.log('[Boot] Аватар из IndexedDB');
    }

    if (savedAvatar) {
      State.player.avatar = savedAvatar;
      console.log('[Boot] headImage:', savedAvatar.headImage ? 'есть' : 'нет');
    } else {
      console.log('[Boot] Аватар не найден');
    }
  } catch (e) {
    console.error('[Boot] Ошибка загрузки аватара:', e);
  }

  // Прогресс
  try {
    State.stories.completed = Storage.load('stories_completed', {});
  } catch (e) {}

  // Экраны
  try {
    Router.register('menu',     MenuScreen);
    Router.register('avatar',   AvatarScreen);
    Router.register('draw',     DrawScreen);
    Router.register('story',    StoryScreen);
    Router.register('minigame', MinigameScreen);
  } catch (e) {
    console.error('[Boot] Ошибка регистрации:', e);
  }

  // Старт
  try {
    const startScreen = State.player.avatar ? 'menu' : 'avatar';
    Router.go(startScreen);
    console.log('[Boot] Ready. Screen:', startScreen);
  } catch (e) {
    console.error('[Boot] Ошибка старта:', e);
    try { Router.go('menu'); } catch (_) {}
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

window.addEventListener('error', (e) => {
  console.error('[Global]', e.error);
});
