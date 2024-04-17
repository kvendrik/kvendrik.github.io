import KonamiCodeViz from './konami-viz.mjs';

const isTouchDevice = 'ontouchstart' in window;

if (!isTouchDevice) {
  initializeKonamiCodeUi();
}

function initializeKonamiCodeUi() {
  const konamiNode = document.querySelector('.konami-viz');
  const konami = new KonamiCodeViz(konamiNode);

  // make sure the instructions aren't shown for browsers
  // that don't support JS modules as this file won't load
  konamiNode.classList.remove('mastfoot__konami--is-hidden');

  konami.bindEvents();
  konami.onComplete(() => {
    document.body.classList.add('body--is-hidden');
    setTimeout(() => {
      location.href = '/retro';
    }, 1000);
  });
}
