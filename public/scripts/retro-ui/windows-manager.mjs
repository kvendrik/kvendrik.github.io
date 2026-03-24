import {render as renderMarkdown} from './markdown.mjs';

export default class WindowsManager {
  constructor(wrapper, template, givenOptions) {
    const options = givenOptions || {
      Selectors: {
        window: '[data-window]',
        closeButton: '[data-close-button]',
        titleBar: '[data-title-bar]',
        title: '[data-title]',
        content: '[data-content]',
        startBar: '[data-start-bar]',
      },
      Classes: {
        topWindow: 'window--top-window',
      },
    };

    this.dragState = {
      dragging: false,
      node: null,
      cursorOffset: {x: 0, y: 0},
    };

    this.getUnqiueWindowId = createUniqueIdFactory('window');
    this.openWindowDetails = null;
    this.openWindows = new Map();

    this.wrapper = wrapper;
    this.template = template;
    this.options = options;
    this.startBarHeight = wrapper.querySelector(options.Selectors.startBar).offsetHeight;

    this.syncOpenWindowsFromDom();
  }

  syncOpenWindowsFromDom() {
    const {wrapper, options: {Selectors, Classes}} = this;
    const windowNodes = wrapper.querySelectorAll(Selectors.window);
    if (!windowNodes.length) {
      return;
    }

    for (const windowNode of windowNodes) {
      const {id} = windowNode.dataset;

      if (id) {
        this.openWindows.set(id, windowNode);
      }

      this.randomizeWindowPosition(windowNode);
    }

    const nodes = [...windowNodes];
    const topWindow =
      nodes.find((n) => n.classList.contains(Classes.topWindow)) ??
      nodes[nodes.length - 1];

    const focusableElements = topWindow.querySelectorAll('button, a');

    if (!focusableElements.length) {
      return;
    }

    this.openWindowDetails = {
      lastFocus: document.activeElement,
      first: focusableElements[0],
      last: focusableElements[focusableElements.length - 1],
    };
  }

  bindEvents() {
    const {wrapper} = this;
    wrapper.addEventListener('click', this.handleClick.bind(this));
    wrapper.addEventListener('mousedown', this.handleMousedown.bind(this));
    wrapper.addEventListener('mousemove', this.handleMousemove.bind(this));
    wrapper.addEventListener('mouseup', this.handleMouseup.bind(this));
    wrapper.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  handleMousedown({target, clientX, clientY}) {
    const {options: {Selectors}} = this;
    const closestWindow = target.closest(Selectors.window);

    if (closestWindow) {
      this.moveWindowToTop(closestWindow);
    }

    if (!target.closest(Selectors.titleBar) || target.matches(Selectors.closeButton)) {
      return;
    }

    const {left, top} = target.getBoundingClientRect();

    this.dragState = {
      dragging: true,
      node: closestWindow,
      cursorOffset: {x: clientX - left, y: clientY - top}
    };
  }

  handleMousemove({clientX, clientY}) {
    const {dragging, node, cursorOffset} = this.dragState;
    if (!dragging) return;

    const x = clientX - cursorOffset.x;
    const y = clientY - cursorOffset.y;

    node.setAttribute(
      'style',
      `transform: translate(${x}px, ${y}px)`,
    );
  }

  handleMouseup() {
    this.dragState.dragging = false;
  }

  handleKeydown(evt) {
    const {openWindowDetails} = this;

    if (!openWindowDetails) {
      return;
    }

    const {key} = evt;

    if (key === 'Tab') {
      const {shiftKey} = evt;
      const {first, last} = openWindowDetails;

      if (shiftKey && document.activeElement === first) {
        evt.preventDefault();
        last.focus();
      }

      if (!shiftKey && document.activeElement === last) {
        evt.preventDefault();
        first.focus();
      }
    }

    if (key === 'Escape') {
      const {options: {Selectors}} = this;
      const {target} = evt;
      const windowNode = target.closest(Selectors.window);
      if (!windowNode) {
        return;
      }
      this.close(windowNode);
    }
  }

  spawn({id, title, content}) {
    if (this.openWindows.has(id)) {
      return;
    }

    const {options: {Selectors}} = this;
    const {content: windowFragment} = this.template.cloneNode(true);

    const windowNode = windowFragment.querySelector(Selectors.window);
    const titleNode = windowNode.querySelector(Selectors.title);
    const contentNode = windowNode.querySelector(Selectors.content);

    titleNode.textContent = title;
    const html =
      typeof content === 'string' && id.endsWith('.md')
        ? renderMarkdown(content)
        : content;
    contentNode.innerHTML = html;

    const windowId = this.getUnqiueWindowId();
    windowNode.setAttribute('aria-labelledby', `${windowId}-title`);
    windowNode.setAttribute('data-id', id);
    titleNode.setAttribute('id', `${windowId}-title`);

    this.wrapper.appendChild(windowFragment);
    this.randomizeWindowPosition(windowNode);

    this.openWindows.set(id, windowNode);

    const focusableElements = windowNode.querySelectorAll('button, a');
    this.openWindowDetails = {
      lastFocus: document.activeElement,
      first: focusableElements[0],
      last: focusableElements[focusableElements.length - 1]
    };
    setTimeout(() => this.openWindowDetails.first.focus(), 0);
  }

  randomizeWindowPosition(windowNode) {
    const {wrapper} = this;
    const wrapperWidth = wrapper.offsetWidth;
    const wrapperHeight = (wrapper.offsetHeight - this.startBarHeight) / 1.4;

    const windowFitsInWidth = wrapperWidth >= windowNode.offsetWidth;
    const windowFitsInHeight = wrapperHeight >= windowNode.offsetHeight;

    if (!windowFitsInHeight) {
      if (!windowFitsInWidth) {
        return;
      }
      // dirty fix to not randomize position
      // when wrapper is smaller than default window size
      const windowWidth = windowNode.offsetWidth;
      const maxX = wrapperWidth - windowWidth;
      const centerX = maxX / 2;
      const randomOffsetX = (Math.random() - 0.5) * maxX * 0.2;
      const x = Math.min(Math.max(centerX + randomOffsetX, 0), maxX);
      windowNode.setAttribute(
        'style',
        `transform: translateX(${x}px)`,
      );
      return;
    }

    const windowWidth = windowNode.offsetWidth;
    const windowHeight = windowNode.offsetHeight;

    const maxX = wrapperWidth - windowWidth;
    const maxY = wrapperHeight - windowHeight;
    const centerX = maxX / 2;
    const centerY = maxY / 2;

    // add small randomness around center (about 10% of available space)
    const randomOffsetX = (Math.random() - 0.5) * maxX * 0.2;
    const randomOffsetY = (Math.random() - 0.5) * maxY * 0.2;
    const x = Math.min(Math.max(centerX + randomOffsetX, 0), maxX);
    const y = Math.min(Math.max(centerY + randomOffsetY, 0), maxY);

    windowNode.setAttribute(
      'style',
      `transform: translate(${x}px, ${y}px)`,
    );
  }

  close(windowNode) {
    windowNode.parentNode.removeChild(windowNode);
    this.openWindows.delete(windowNode.dataset.id);

    if (this.openWindowDetails) {
      const {lastFocus} = this.openWindowDetails;
      this.openWindowDetails = null;
      lastFocus.focus();
    }
  }

  handleClick({target}) {
    const {options: {Selectors}} = this;

    if (!target.matches(Selectors.closeButton)) {
      return;
    }

    const windowNode = target.closest(Selectors.window);

    if (!windowNode) {
      return;
    }

    this.close(windowNode);
  }

  moveWindowToTop(topWindow) {
    const {options: {Selectors, Classes}} = this;
    const windowNodes = this.wrapper.querySelectorAll(Selectors.window);

    for (const windowNode of windowNodes) {
      windowNode.classList.remove(Classes.topWindow);
    }

    topWindow.classList.add(Classes.topWindow);
  }
}

function createUniqueIdFactory(prefix) {
  let index = 0;
  return () => {
    index++;
    return `${prefix}-${index}`;
  };
}
