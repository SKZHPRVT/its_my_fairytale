// ============================================
// INVENTORY — инвентарь игрока
// ============================================

import { State } from '../core/state.js';
import { Storage } from '../core/storage.js';

export const Inventory = {
  init() {
    const saved = Storage.load('inventory', []);
    State.player.inventory = saved;
  },

  add(item) {
    if (this.has(item.id)) return false;
    State.player.inventory.push(item);
    this._save();
    State.emit('inventory:add', item);
    return true;
  },

  remove(id) {
    const idx = State.player.inventory.findIndex(i => i.id === id);
    if (idx === -1) return false;
    const [item] = State.player.inventory.splice(idx, 1);
    this._save();
    State.emit('inventory:remove', item);
    return true;
  },

  has(id) {
    return State.player.inventory.some(i => i.id === id);
  },

  get(id) {
    return State.player.inventory.find(i => i.id === id) || null;
  },

  list() {
    return State.player.inventory;
  },

  _save() {
    Storage.save('inventory', State.player.inventory);
  },
};
