import KonamiCodeViz from './konami-viz.mjs';

const konamiNode = document.querySelector('.konami-viz');
const konami = new KonamiCodeViz(konamiNode);

// make sure the instructions aren't shown for browsers
// that don't support JS modules as this file won't load
konamiNode.classList.remove('konami-viz--is-hidden');

konami.bindEvents();
konami.onComplete(() => {
  document.body.classList.add('body--is-hidden');
  setTimeout(() => {
    location.href = '/retro';
  }, 1000);
});
