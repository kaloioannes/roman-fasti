'use strict';
document.querySelector('#theme-button').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('fasti-theme', theme); } catch {}
});
fetch('project.json').then(response => {
  if (!response.ok) throw new Error('目录加载失败');
  return response.json();
}).then(project => {
  const available = document.querySelector('#available-periods');
  const planned = document.querySelector('#planned-periods');
  available.replaceChildren(); planned.replaceChildren();
  for (const period of project.periods) {
    if (period.status === 'available') {
      const card = document.createElement('a');
      card.className = 'period-card'; card.href = `${period.id}/`;
      for (const [tag, text, className] of [['span',period.range,'eyebrow'],['h3',period.title,''],['p',period.description,''],['span','打开纪年 ↗','period-action']]) {
        const element = document.createElement(tag); element.textContent = text; element.className = className; card.append(element);
      }
      available.append(card);
    } else {
      const item = document.createElement('li'); item.textContent = `${period.title} · ${period.range}`; planned.append(item);
    }
  }
  document.querySelector('.planned-section').hidden = !planned.children.length;
}).catch(() => { document.querySelector('#catalog-status').textContent = '时期目录暂时无法刷新，可继续使用上方入口。'; });
