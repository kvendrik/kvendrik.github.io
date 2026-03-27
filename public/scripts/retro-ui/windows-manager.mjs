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
      const contentNode = windowNode.querySelector(Selectors.content);
      const root = contentNode.querySelector('article') ?? contentNode;

      if (id) {
        this.openWindows.set(id, windowNode);
      }

      this.randomizeWindowPosition(windowNode);
      root.innerHTML = this.renderWindowContent(windowNode, root.textContent ?? '');
      windowNode.removeAttribute('hidden');
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
    this.setWindowPosition(node, x, y);
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

  spawn({id, title, content, size = 'normal', kind = 'normal'}) {
    if (this.openWindows.has(id)) {
      this.moveWindowToTop(this.openWindows.get(id));
      return;
    }

    const {options: {Selectors}} = this;
    const {content: windowFragment} = this.template.cloneNode(true);

    const windowNode = windowFragment.querySelector(Selectors.window);
    const titleNode = windowNode.querySelector(Selectors.title);
    const contentNode = windowNode.querySelector(Selectors.content);

    titleNode.textContent = title;
    windowNode.dataset.kind = kind;
    contentNode.innerHTML = this.renderWindowContent(windowNode, content);

    const windowId = this.getUnqiueWindowId();
    windowNode.setAttribute('aria-labelledby', `${windowId}-title`);
    windowNode.setAttribute('data-id', id);
    titleNode.setAttribute('id', `${windowId}-title`);

    this.wrapper.appendChild(windowFragment);

    if (size === 'large') {
      windowNode.classList.add('window--large');
    }

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
    const wrapperHeight = wrapper.offsetHeight - this.startBarHeight;
    const windowWidth = windowNode.offsetWidth;
    const windowHeight = windowNode.offsetHeight;

    const maxX = Math.max(wrapperWidth - windowWidth, 0);
    const maxY = Math.max(wrapperHeight - windowHeight, 0);
    const centerX = maxX * 0.3;
    const centerY = maxY * 0.2;

    // Keep new windows near the center with a small random offset.
    const randomOffsetX = (Math.random() - 0.5) * Math.min(maxX * 0.3, 120);
    const randomOffsetY = (Math.random() - 0.5) * Math.min(maxY * 0.3, 80);
    const x = Math.min(Math.max(centerX + randomOffsetX, 0), maxX);
    const y = Math.min(Math.max(centerY + randomOffsetY, 0), maxY);
    this.setWindowPosition(windowNode, x, y);
  }

  setWindowPosition(windowNode, x = 0, y = 0) {
    windowNode.style.setProperty('--window-x', `${x}px`);
    windowNode.style.setProperty('--window-y', `${y}px`);
  }

  renderWindowContent(windowNode, content) {
    const renderedContent = renderMarkdown(content);

    if (windowNode.dataset.kind === 'article') {
      return `<article>${renderedContent}</article>`;
    }

    return renderedContent;
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
