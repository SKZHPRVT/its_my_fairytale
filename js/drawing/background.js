// ============================================
// BACKGROUND — заливка фона (заглушка на будущее)
// ============================================

export const Background = {
  // Позже: flood fill, заливка областей
  fill(canvas, color) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  },
};
