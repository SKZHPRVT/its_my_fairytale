// ============================================
// STORY SCREEN — прохождение сказки
// ============================================

import { State } from '../core/state.js';
import { Router } from '../core/router.js';
import { StoryEngine } from '../story/engine.js';
import { createChoiceButtons } from '../ui/buttons.js';
import { Toast } from '../ui/toast.js';

let engine = null;

export async function StoryScreen(root, params = {}) {
  const { storyId = 'prince_and_dragon' } = params;

  const screen = document.createElement('div');
  screen.className = 'screen story-screen';
  root.appendChild(screen);

  // Загружаем сказку
  let storyData;
  try {
    storyData = await StoryEngine.load(storyId);
  } catch (e) {
    screen.innerHTML = `<div class="card">Ошибка загрузки сказки: ${e.message}</div>`;
    return;
  }

  if (!engine || engine.story.id !== storyId) {
    engine = new StoryEngine(storyData);
  }

  const renderChapter = (chapterId) => {
    const ch = engine.goTo(chapterId);
    if (!ch) return;

    screen.innerHTML = `
      <div class="screen-header">
        <button class="btn btn-ghost" id="btn-back">←</button>
        <div class="screen-title">${engine.story.emoji} ${engine.story.title}</div>
      </div>
      <div class="screen-body">
        <div class="story-text">${ch.text || ''}</div>
        <div id="chapter-extra"></div>
      </div>
      <div class="screen-footer" id="chapter-footer"></div>
    `;

    screen.querySelector('#btn-back').onclick = () => Router.go('menu');

    const extra = screen.querySelector('#chapter-extra');
    const footer = screen.querySelector('#chapter-footer');

    // Обработка по типу
    if (ch.type === 'text') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-block';
      btn.textContent = ch.ending ? '🏆 Финал' : 'Далее →';
      btn.onclick = () => {
        if (ch.ending) {
          handleEnding(ch.ending);
        } else {
          renderChapter(ch.next);
        }
      };
      footer.appendChild(btn);
    }

    if (ch.type === 'choice') {
      const btns = createChoiceButtons(ch.choices, (id) => {
        const choice = ch.choices.find(c => c.id === id);
        if (choice) renderChapter(choice.next);
      });
      extra.appendChild(btns);
    }

    if (ch.type === 'draw') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-block';
      btn.textContent = '🎨 Нарисовать';
      btn.onclick = () => {
        Router.go('draw', {
          assetKey: ch.assetKey,
          prompt: ch.text,
          onDone: () => renderChapter(ch.next),
        });
      };
      footer.appendChild(btn);
    }

    if (ch.type === 'minigame') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-block';
      btn.textContent = '🎮 Играть';
      btn.onclick = () => {
        Router.go('minigame', {
          minigame: ch.minigame,
          onWin:  () => renderChapter(ch.minigame.onWin),
          onLose: () => renderChapter(ch.minigame.onLose),
        });
      };
      footer.appendChild(btn);
    }
  };

  const handleEnding = (endingId) => {
    const ending = engine.story.endings?.[endingId];
    if (ending) {
      Toast.show(`🏆 ${ending.title}`);
      // TODO: добавить награду в инвентарь
    }
    engine.finish(endingId);
    Router.go('menu');
  };

  // Стартуем с первой главы (или с текущей)
  const startId = State.stories.currentChapter || engine.currentChapterId;
  renderChapter(startId);

  return () => {};
}
