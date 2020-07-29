import WindowsManager from './windows-manager.mjs';

export default class WindowsUi {
  constructor(wrapper, options = {
    Selectors: {
      window: '[data-window]',
      windowTitleBar: '[data-title-bar]',
      windowTitle: '[data-title]',
      windowContent: '[data-content]',
      windowCloseButton: '[data-close-button]',
      startBar: '[data-start-bar]',
      desktopItem: '[data-desktop-item]',
    },
    Classes: {
      topWindow: 'window__top-window',
      desktopItemSelected: 'desktop__item--is-selected',
    },
    templateId: 'window-template',
  }) {
    this.wrapper = wrapper;
    this.options = options;
    this.desktopItems = wrapper.querySelectorAll(options.Selectors.desktopItem);
    this.windowsManager = new WindowsManager(wrapper, wrapper.querySelector(`#${options.templateId}`, {
      Selectors: {
        window: options.Selectors.window,
        closeButton: options.Selectors.windowCloseButton,
        titleBar: options.Selectors.windowTitleBar,
        title: options.Selectors.windowTitle,
        content: options.Selectors.windowContent,
        startBar: options.Selectors.startBar,
      },
      Classes: {
        topWindow: options.Selectors.topWindow,
      },
    }));
  }

  bindEvents() {
    const {wrapper, windowsManager} = this;
    wrapper.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    wrapper.addEventListener('mousedown', this.handleMousedown.bind(this));
    windowsManager.bindEvents();
  }

  handleMousedown() {
    this.unselectDesktopItems();
  }

  handleDoubleClick({target}) {
    const item = target.closest(this.options.Selectors.desktopItem);
    if (item) this.handleDesktopItemDoubleClick(item);
  }

  unselectDesktopItems() {
    for (const item of this.desktopItems) {
      item.classList.remove(this.options.Classes.desktopItemSelected);
    }
  }

  handleDesktopItemDoubleClick(item) {
    this.unselectDesktopItems();
    item.classList.add(this.options.Classes.desktopItemSelected);

    const title = item.innerText;
    const content = item.dataset.notepadContent;

    this.windowsManager.spawn({title, content});
  }
}
