import KonamiCodeViz from './konami-viz.mjs';

const konami = new KonamiCodeViz(document.querySelector('.konami-viz'));
konami.bindEvents();
konami.onComplete(() => alert('Hello!'));
