// ============================================
// BUTTONS — кнопки ветвления
// ============================================

export function createChoiceButtons(choices, onSelect) {
  const wrap = document.createElement('div');
  wrap.className = 'choices';

  choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-block';
    if (c.color === 'yellow') btn.classList.add('btn');
    if (c.color === 'blue')   btn.classList.add('btn-blue');
    if (c.color === 'red')    btn.classList.add('btn-red');
    if (c.color === 'green')  btn.classList.add('btn-green');
    btn.textContent = c.text;
    btn.onclick = () => onSelect(c.id);
    wrap.appendChild(btn);
  });

  return wrap;
}
