// ============================================
// EQUIPMENT — экипировка (заглушка на будущее)
// ============================================

import { State } from '../core/state.js';

export const Equipment = {
  slots: ['hat', 'weapon', 'accessory'],

  equip(slot, item) {
    if (!this.slots.includes(slot)) return false;
    State.player.equipment = State.player.equipment || {};
    State.player.equipment[slot] = item;
    State.emit('equipment:change', { slot, item });
    return true;
  },

  unequip(slot) {
    if (State.player.equipment) delete State.player.equipment[slot];
    State.emit('equipment:change', { slot, item: null });
  },

  get(slot) {
    return State.player.equipment?.[slot] || null;
  },
};
