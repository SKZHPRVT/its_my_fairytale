// ============================================
// PROGRESSION — уровни, опыт, ачивки
// ============================================

import { State } from '../core/state.js';
import { Storage } from '../core/storage.js';

export const Progression = {
  init() {
    const saved = Storage.load('progression', null);
    if (saved) {
      State.player.level = saved.level || 1;
      State.player.xp = saved.xp || 0;
      State.player.achievements = saved.achievements || [];
    }
  },

  addXP(amount) {
    State.player.xp += amount;
    while (State.player.xp >= this._xpForLevel(State.player.level)) {
      State.player.xp -= this._xpForLevel(State.player.level);
      State.player.level++;
      State.emit('progression:levelup', State.player.level);
    }
    this._save();
    State.emit('progression:xp', { xp: State.player.xp, level: State.player.level });
  },

  unlockAchievement(id) {
    if (State.player.achievements.includes(id)) return false;
    State.player.achievements.push(id);
    this._save();
    State.emit('progression:achievement', id);
    return true;
  },

  _xpForLevel(level) {
    return 100 + (level - 1) * 50;
  },

  _save() {
    Storage.save('progression', {
      level: State.player.level,
      xp: State.player.xp,
      achievements: State.player.achievements,
    });
  },
};
