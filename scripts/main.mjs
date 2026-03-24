import RetroUi from './retro-ui/index.mjs';

const retroUi = new RetroUi(document.body);

const landingScreen = document.querySelector('[data-landing-screen]');
const desktopWrapper = document.querySelector('[data-desktop]');

retroUi.bindEvents();
hideLandingScreen();

function hideLandingScreen() {
  landingScreen.classList.add('landing-screen--is-hidden');
  landingScreen.setAttribute('hidden', true);
  desktopWrapper.removeAttribute('hidden');
  document.body.removeAttribute('aria-live');
}
