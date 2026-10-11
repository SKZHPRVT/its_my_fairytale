// ============================================
// BRANCHES — логика ветвления
// ============================================

export const Branches = {
  // Проверить, разблокирована ли сказка
  isUnlocked(story, completedStories) {
    if (!story.requires || story.requires.length === 0) return true;
    return story.requires.every(req => completedStories[req]);
  },

  // Получить доступные ветки
  getAvailableChoices(chapter, playerState) {
    if (!chapter.choices) return [];
    return chapter.choices.filter(c => {
      if (!c.requires) return true;
      return c.requires.every(r => playerState.inventory.some(i => i.id === r));
    });
  },
};
