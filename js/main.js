// ============================================
// MAIN — точка входа
// ============================================

import { State } from './core/state.js';
import { Router } from './core/router.js';
import { Storage } from './core/storage.js';
import { Telegram } from './core/telegram.js';
import { Inventory } from './player/inventory.js';
import { Progression } from './player/progression.js';
import { Avatar } from './player/avatar.js';
import { Toast } from './ui/toast.js';

import { MenuScreen } from './screens/menu.js';
import { AvatarScreen } from './screens/avatar.js';
import { DrawScreen } from './screens/draw.js';
import { StoryScreen } from './screens/story.js';
import { MinigameScreen } from './screens/minigame.js';

console.log('[Main] Модуль main.js загружен');

async function boot() {
  console.log('[Boot] Its My Fairytale starting...');

  try {
    Telegram.init();
    Inventory.init();
    Progression.init();

    // Загружаем аватар из IndexedDB (асинхронно)
    const savedAvatar = await Avatar.load();
    if (savedAvatar) {
      State.player.avatar = savedAvatar;
      console.log('[Boot] Аватар загружен из IndexedDB');
    } else {
      console.log('[Boot] Аватар не найден');
    }

    // Прогресс сказок
    const completed = Storage.load('stories_completed', {});
    State.stories.completed = completed;

    // Регистрируем экраны
    Router.register('menu',     MenuScreen);
    Router.register('avatar',   AvatarScreen);
    Router.register('draw',     DrawScreen);
    Router.register('story',    StoryScreen);
    Router.register('minigame', MinigameScreen);

    console.log('[Boot] Экраны зарегистрированы');

    const startScreen = State.player.avatar ? 'menu' : 'avatar';
    Router.go(startScreen);

    console.log('[Boot] Ready. Screen:', startScreen);
  } catch (e) {
    console.error('[Boot] Ошибка инициализации:', e);
    document.body.insertAdjacentHTML('beforeend',
      '<div style="position:fixed;bottom:0;left:0;right:0;background:#c00;color:#fff;padding:12px;font-family:monospace;font-size:12px;z-index:99999;">' +
      '❌ BOOT ERROR: ' + (e.message || e) + '</div>'
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

window.addEventListener('error', (e) => {
  console.error('[Global error]', e.error);
  try { Toast.show('Ошибка: ' + (e.error?.message || 'unknown')); } catch (_) {}
});
