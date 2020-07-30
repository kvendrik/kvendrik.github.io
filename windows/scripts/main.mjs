import WindowsUi from './windows-ui/index.mjs';

const windowsUi = new WindowsUi(document.body);

const logoScreen = document.querySelector('[data-logo-screen]');
const desktopWrapper = document.querySelector('[data-desktop]');

windowsUi.bindEvents();
setTimeout(hideLogoScreen, 5000);

function hideLogoScreen() {
  logoScreen.classList.add('logo-screen--is-hidden');
  logoScreen.setAttribute('aria-hidden', true);
  desktopWrapper.setAttribute('aria-hidden', false);
}
