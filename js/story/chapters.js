// ============================================
// CHAPTERS — типы глав (обработчики)
// ============================================

export const ChapterTypes = {
  TEXT:     'text',
  DRAW:     'draw',
  CHOICE:   'choice',
  SCENE:    'scene',
  MINIGAME: 'minigame',
};

export function isDrawChapter(ch)     { return ch.type === ChapterTypes.DRAW; }
export function isChoiceChapter(ch)   { return ch.type === ChapterTypes.CHOICE; }
export function isMinigameChapter(ch) { return ch.type === ChapterTypes.MINIGAME; }
export function isSceneChapter(ch)    { return ch.type === ChapterTypes.SCENE; }
