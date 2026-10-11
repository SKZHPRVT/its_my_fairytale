// ============================================
// ENDINGS — концовки
// ============================================

export const Endings = {
  // Применить награду за концовку
  applyReward(ending, inventory) {
    if (ending.reward) {
      inventory.add({
        id: ending.reward,
        name: ending.rewardName || ending.reward,
        emoji: ending.emoji || '🎁',
        power: ending.power || 1,
      });
    }
  },
};
