import RetroUi from './retro-ui/index.mjs';

const retroUi = new RetroUi(document.body);

const landingScreen = document.querySelector('[data-landing-screen]');
const desktopWrapper = document.querySelector('[data-desktop]');

retroUi.bindEvents();
setTimeout(hideLandingScreen, 5000);

function hideLandingScreen() {
  landingScreen.classList.add('landing-screen--is-hidden');
  landingScreen.setAttribute('aria-hidden', true);
  desktopWrapper.setAttribute('aria-hidden', false);
}
