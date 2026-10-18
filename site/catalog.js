'use strict';
document.querySelector('#theme-button').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#181d1c' : '#f8f6f1';
  try { localStorage.setItem('fasti-theme', theme); } catch {}
});
