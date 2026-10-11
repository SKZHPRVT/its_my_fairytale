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

  // Запоминаем текущую сказку
  State.stories.currentStoryId = storyId;

  // Загружаем сказку (один раз)
  if (!engine || engine.story.id !== storyId) {
    let storyData;
    try {
      storyData = await StoryEngine.load(storyId);
    } catch (e) {
      screen.innerHTML = `<div class="card">Ошибка загрузки сказки: ${e.message}</div>`;
      return;
    }
    engine = new StoryEngine(storyData);
  }

  const renderChapter = (chapterId) => {
    const ch = engine.goTo(chapterId);
    if (!ch) {
      console.error('[Story] Глава не найдена:', chapterId);
      return;
    }

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

    screen.querySelector('#btn-back').onclick = () => {
      State.stories.pendingChapter = null;
      Router.go('menu');
    };

    const extra = screen.querySelector('#chapter-extra');
    const footer = screen.querySelector('#chapter-footer');

    // ---------- TEXT ----------
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

    // ---------- CHOICE ----------
    if (ch.type === 'choice') {
      const btns = createChoiceButtons(ch.choices, (id) => {
        const choice = ch.choices.find(c => c.id === id);
        if (choice) renderChapter(choice.next);
      });
      extra.appendChild(btns);
    }

    // ---------- DRAW ----------
    if (ch.type === 'draw') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-block';
      btn.textContent = '🎨 Нарисовать';
      btn.onclick = () => {
        // Запоминаем, куда вернуться после рисования
        State.stories.pendingChapter = ch.next;
        State.stories.currentChapter = ch.id;

        // Переходим на экран рисования
        Router.go('draw', {
          assetKey: ch.assetKey,
          prompt: ch.text,
          onDone: () => {
            // После сохранения — возвращаемся в сказку
            State.stories.pendingChapter = null;
            Router.go('story', { storyId });
          },
        });
      };
      footer.appendChild(btn);
    }

    // ---------- MINIGAME ----------
    if (ch.type === 'minigame') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-block';
      btn.textContent = '🎮 Играть';
      btn.onclick = () => {
        State.stories.pendingChapter = ch.minigame.onWin;
        Router.go('minigame', {
          minigame: ch.minigame,
          onWin: () => {
            State.stories.pendingChapter = null;
            Router.go('story', { storyId });
          },
          onLose: () => {
            // Переигрываем — просто возвращаемся на ту же главу
            State.stories.pendingChapter = null;
            Router.go('story', { storyId });
          },
        });
      };
      footer.appendChild(btn);
    }
  };

  const handleEnding = (endingId) => {
    const ending = engine.story.endings?.[endingId];
    if (ending) {
      Toast.show(`🏆 ${ending.title}`);
    }
    engine.finish(endingId);
    State.stories.currentChapter = null;
    State.stories.pendingChapter = null;
    Router.go('menu');
  };

  // ---------- Стартовая глава ----------
  // Если есть отложенный переход (после рисования или мини-игры) — идём туда
  let startId;
  if (State.stories.pendingChapter) {
    startId = State.stories.pendingChapter;
    State.stories.pendingChapter = null;
  } else if (State.stories.currentChapter && engine.getChapter(State.stories.currentChapter)) {
    startId = State.stories.currentChapter;
  } else {
    startId = engine.story.startChapter || engine.story.chapters[0].id;
  }

  renderChapter(startId);

  return () => {};
}
