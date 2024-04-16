import KonamiCodeViz from './konami-viz.mjs';

const isTouchDevice = 'ontouchstart' in window;
const isSmallScreen = window.matchMedia('(max-width: 800px)').matches;

if (!isTouchDevice) {
  initializeKonamiCodeUi();

  if (!isSmallScreen) {
    initializeSectionWaypoints();
  }
}

function initializeSectionWaypoints() {
  const hasIntersectionObserverSupport = "IntersectionObserver" in window && "IntersectionObserverEntry" in window && "intersectionRatio" in window.IntersectionObserverEntry.prototype;
  if (!hasIntersectionObserverSupport) return;

  const sections = document.querySelectorAll("[data-waypoint-section]");

  const observer = new IntersectionObserver((entries) => {
    let newVisibleEntryTarget = null;

    for (const {isIntersecting, target} of entries) {
      if (target.getAttribute('data-waypoint-section') === 'active' && isIntersecting) {
        newVisibleEntryTarget = target;
      }
    }

    if (newVisibleEntryTarget !== null) {
      for (const section of sections) section.setAttribute('data-waypoint-section', 'active');
      newVisibleEntryTarget.setAttribute('data-waypoint-section', 'visible');
    }
  }, {
    rootMargin: "0px",
    threshold: 0.75,
  });

  document.body.classList.add('body--waypoint-sections-active');

  for (const section of sections) {
    section.setAttribute('data-waypoint-section', 'active');
    observer.observe(section);
  }
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
