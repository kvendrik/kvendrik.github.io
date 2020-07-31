import WindowsManager from './windows-manager.mjs';

export default class WindowsUi {
  constructor(wrapper, givenOptions) {
    const options = givenOptions || {
      Selectors: {
        window: '[data-window]',
        windowTitleBar: '[data-title-bar]',
        windowTitle: '[data-title]',
        windowContent: '[data-content]',
        windowCloseButton: '[data-close-button]',
        startBar: '[data-start-bar]',
        time: '[data-time]',
        desktopItem: '[data-desktop-item]',
      },
      Classes: {
        topWindow: 'window__top-window',
        desktopItemSelected: 'desktop__item--is-selected',
      },
      templateId: 'window-template',
    };

    this.wrapper = wrapper;
    this.options = options;
    this.desktopItems = wrapper.querySelectorAll(options.Selectors.desktopItem);
    this.timeNode = document.querySelector(options.Selectors.time);
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

    this.setTimeUpdater();
  }

  setTimeUpdater() {
    const currentPrettyTime = new Date().toLocaleString([], {hour: 'numeric', minute: 'numeric', hour12: true});
    this.timeNode.innerText = currentPrettyTime;
    setTimeout(this.setTimeUpdater.bind(this), 60 * 1000);
  }

  bindEvents() {
    const {wrapper, windowsManager} = this;
    wrapper.addEventListener('ontouchstart' in window ? 'click' : 'dblclick', this.handleClick.bind(this));
    wrapper.addEventListener('mousedown', this.handleMousedown.bind(this));

    if (!('ontouchstart' in window)) {
      wrapper.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    windowsManager.bindEvents();
  }

  handleMousedown() {
    this.unselectDesktopItems();
  }

  handleKeydown({key, target}) {
    if (key !== 'Enter') {
      return;
    }
    const isDesktopItem = target.matches(this.options.Selectors.desktopItem);
    if (isDesktopItem) this.openDesktopItem(target);
  }

  handleClick({target}) {
    const item = target.closest(this.options.Selectors.desktopItem);
    if (item) this.openDesktopItem(item);
  }

  unselectDesktopItems() {
    for (const item of this.desktopItems) {
      item.classList.remove(this.options.Classes.desktopItemSelected);
    }
  }

  openDesktopItem(item) {
    this.unselectDesktopItems();
    item.classList.add(this.options.Classes.desktopItemSelected);

    const title = item.innerText;
    const content = item.dataset.notepadContent;

    this.windowsManager.spawn({title, content});
  }
}
