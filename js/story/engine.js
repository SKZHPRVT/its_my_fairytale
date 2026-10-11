// ============================================
// STORY ENGINE — движок прохождения сказки
// ============================================

import { State } from '../core/state.js';
import { Storage } from '../core/storage.js';
import { Router } from '../core/router.js';
import { Inventory } from '../player/inventory.js';
import { Progression } from '../player/progression.js';

export class StoryEngine {
  constructor(storyData) {
    this.story = storyData;
    this.currentChapterId = storyData.startChapter || storyData.chapters[0].id;
  }

  getChapter(id) {
    return this.story.chapters.find(c => c.id === id) || null;
  }

  getCurrentChapter() {
    return this.getChapter(this.currentChapterId);
  }

  // Перейти на следующую главу (по id или по next)
  goTo(chapterId) {
    const chapter = this.getChapter(chapterId);
    if (!chapter) {
      console.error('[Story] Глава не найдена:', chapterId);
      return null;
    }
    this.currentChapterId = chapterId;
    State.stories.currentChapter = chapterId;
    State.emit('story:chapter', chapter);
    return chapter;
  }

  // Перейти по "next" текущей главы
  next() {
    const cur = this.getCurrentChapter();
    if (!cur) return null;
    if (cur.next) return this.goTo(cur.next);
    if (cur.choices) return null; // ждём выбора
    return this.finish();
  }

  // Сделать выбор
  choose(choiceId) {
    const cur = this.getCurrentChapter();
    const choice = cur.choices?.find(c => c.id === choiceId);
    if (!choice) return null;
    return this.goTo(choice.next);
  }

  // Финал
  finish(endingId = null) {
    const storyId = this.story.id;
    if (!State.stories.completed[storyId]) {
      State.stories.completed[storyId] = [];
    }
    if (endingId && !State.stories.completed[storyId].includes(endingId)) {
      State.stories.completed[storyId].push(endingId);
    }
    Storage.save('stories_completed', State.stories.completed);

    Progression.addXP(50);
    State.emit('story:finished', { storyId, endingId });
    return { finished: true, endingId };
  }

  // Загрузка сказки из JSON (fetch)
  static async load(storyId) {
    const res = await fetch(`data/stories/${storyId}.json`);
    if (!res.ok) throw new Error(`Не удалось загрузить сказку: ${storyId}`);
    return await res.json();
  }
}
