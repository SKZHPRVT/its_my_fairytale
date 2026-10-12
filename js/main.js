// ============================================
// MAIN — точка входа
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

  try { Telegram.init(); } catch (e) { console.error('[Boot] Telegram:', e); }
  try { Inventory.init(); } catch (e) { console.error('[Boot] Inventory:', e); }
  try { Progression.init(); } catch (e) { console.error('[Boot] Progression:', e); }

  // Аватар из localStorage (синхронно!)
  try {
    const savedAvatar = Storage.load('avatar', null);
    if (savedAvatar) {
      State.player.avatar = savedAvatar;
      console.log('[Boot] Аватар загружен, headImage:', savedAvatar.headImage ? 'есть' : 'нет');
    } else {
      console.log('[Boot] Аватар не найден');
    }
  } catch (e) {
    console.error('[Boot] Ошибка загрузки аватара:', e);
  }

  // Прогресс сказок
  try {
    const completed = Storage.load('stories_completed', {});
    State.stories.completed = completed;
  } catch (e) {
    console.error('[Boot] Ошибка прогресса:', e);
  }

  // Регистрация экранов
  try {
    Router.register('menu',     MenuScreen);
    Router.register('avatar',   AvatarScreen);
    Router.register('draw',     DrawScreen);
    Router.register('story',    StoryScreen);
    Router.register('minigame', MinigameScreen);
  } catch (e) {
    console.error('[Boot] Ошибка регистрации:', e);
  }

  // Стартовый экран
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
