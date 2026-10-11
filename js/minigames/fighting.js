// ============================================
// FIGHTING — файтинг (3 кнопки) (заглушка)
// ============================================
import { MiniGame } from './engine.js';
export class FightingGame extends MiniGame {
  async init() { console.log('[FightingGame] TODO'); }
  update(dt) {}
  render() { this.ctx.fillStyle = '#000'; this.ctx.fillText('Fighting TODO', 20, 40); }
}
