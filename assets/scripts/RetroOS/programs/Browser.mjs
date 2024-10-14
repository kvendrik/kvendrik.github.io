import {Alert} from "./Alert.mjs";

const ALLOWED_HOSTNAMES = [
  'shopify.com',
  'kvendrik.com',
];

export class Browser {
  constructor(programsManager) {
    this.programsManager = programsManager;
  }

  spawn(url) {
    const {windowsManager} = this.programsManager;

    const template = document.getElementById('browser-template');
    const {content: fragment} = template.cloneNode(true);

    const input = fragment.querySelector('[data-url-input]');

    input.addEventListener(
      'focus',
      () => input.select(),
    );

    input.addEventListener(
      'keyup',
      this.handleUrlInput.bind(this),
    );

    const window = windowsManager.create({
      content: fragment,
      variant: 'large',
    });

    this.window = window;

    window.setTitle(url);
    this.openUrl(url);

    window.show();
    window.moveToTop();
  }

  openUrl(url) {
    this.window.content.querySelector('[data-url-input]').value = url;
    this.window.content.querySelector('iframe').src = url;
  }

  handleUrlInput({key, target: {value}}) {
    if (key !== 'Enter') return;

    const iframe = this.window.content.querySelector('iframe');
    let url = null;

    try {
      url = new URL(value);
    } catch {
      try {
        url = new URL(`https://${value}`);
      } catch {}
    }

    if (url === null) {
      return;
    }

    if (!ALLOWED_HOSTNAMES.includes(url.hostname)) {
      const alert = new Alert(this.programsManager.windowsManager);
      alert.spawn({
        title: 'Whoops!',
        content: 'You can’t navigate to that URL.',
        parentWindow: window,
      });
      return;
    }

    this.window.setTitle(value);
    this.openUrl(url.href);
  }
}