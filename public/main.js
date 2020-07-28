import KonamiCodeViz from './konami-viz.js';

const konami = new KonamiCodeViz(document.querySelector('.konami-viz'));
konami.bindEvents();
konami.onComplete(() => alert('Hello!'));
