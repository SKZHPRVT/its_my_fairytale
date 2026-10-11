// ============================================
// PHYSICS — Angry Birds / Cut the Rope (заглушка)
// ============================================
import { MiniGame } from './engine.js';
export class PhysicsGame extends MiniGame {
  async init() { console.log('[PhysicsGame] TODO'); }
  update(dt) {}
  render() { this.ctx.fillStyle = '#000'; this.ctx.fillText('Physics TODO', 20, 40); }
}
