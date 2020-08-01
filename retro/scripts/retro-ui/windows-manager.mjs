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

    this.wrapper = wrapper;
    this.template = template;
    this.options = options;
    this.startBarHeight = wrapper.querySelector(options.Selectors.startBar).offsetHeight;
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

  spawn({title, content}) {
    const {options: {Selectors}} = this;
    const {content: windowFragment} = this.template.cloneNode(true);

    const windowNode = windowFragment.querySelector(Selectors.window);
    const titleNode = windowNode.querySelector(Selectors.title);
    const contentNode = windowNode.querySelector(Selectors.content);

    titleNode.textContent = title;
    contentNode.innerHTML = content;

    const windowId = this.getUnqiueWindowId();
    windowNode.setAttribute('aria-labelledby', `${windowId}-title`);
    titleNode.setAttribute('id', `${windowId}-title`);

    this.wrapper.appendChild(windowFragment);
    this.randomizeWindowPosition(windowNode);

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
    const wrapperHeight = (wrapper.offsetHeight - this.startBarHeight);
    const windowFitsInWrapper = wrapperWidth >= 500 && wrapperHeight >= 400;

    if (!windowFitsInWrapper) {
      // dirty fix to not randomize position
      // when wrapper is smaller than default window size
      return;
    }

    const windowWidth = windowNode.offsetWidth;
    const windowHeight = windowNode.offsetHeight;

    let x = Math.random() * wrapperWidth;
    let y = Math.random() * wrapperHeight;

    // ensure window isn't out of bounds
    while (x > (wrapperWidth - windowWidth) || y > (wrapperHeight - windowHeight)) {
      x = Math.random() * wrapperWidth;
      y = Math.random() * wrapperHeight;
    }

    windowNode.setAttribute(
      'style',
      `transform: translate(${x}px, ${y}px)`,
    );
  }

  close(windowNode) {
    windowNode.parentNode.removeChild(windowNode);

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
