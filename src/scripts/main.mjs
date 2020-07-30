import KonamiCodeViz from './konami-viz.mjs';

const konami = new KonamiCodeViz(document.querySelector('.konami-viz'));
konami.bindEvents();
konami.onComplete(() => {
  document.body.classList.add('body--is-hidden');
  setTimeout(() => {
    location.href = '/windows';
  }, 1000);
});
