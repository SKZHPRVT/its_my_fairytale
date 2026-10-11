// ============================================
// MODAL — модальные окна
// ============================================

export const Modal = {
  show({ title, content, buttons = [] }) {
    const root = document.getElementById('modal-root');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';

    if (title) {
      const h = document.createElement('h2');
      h.textContent = title;
      h.style.marginBottom = '16px';
      modal.appendChild(h);
    }

    const body = document.createElement('div');
    if (typeof content === 'string') body.innerHTML = content;
    else if (content instanceof HTMLElement) body.appendChild(content);
    modal.appendChild(body);

    if (buttons.length) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '12px';
      row.style.marginTop = '20px';

      buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'btn ' + (b.className || '');
        btn.style.flex = '1';
        btn.textContent = b.text;
        btn.onclick = () => {
          this.close();
          b.onClick?.();
        };
        row.appendChild(btn);
      });
      modal.appendChild(row);
    }

    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) this.close(); };
    root.appendChild(backdrop);
    this._current = backdrop;
    return backdrop;
  },

  close() {
    if (this._current) {
      this._current.remove();
      this._current = null;
    }
  },
};
