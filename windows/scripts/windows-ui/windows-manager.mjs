export default class WindowsManager {
  dragState = {
    dragging: false,
    node: null,
    cursorOffset: {x: 0, y: 0},
  };

  constructor(wrapper, template, options = {
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
  }) {
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

  spawn({title, content}) {
    const {options: {Selectors}} = this;
    const {content: windowFragment} = this.template.cloneNode(true);

    const windowNode = windowFragment.querySelector(Selectors.window);
    const titleNode = windowNode.querySelector(Selectors.title);
    const contentNode = windowNode.querySelector(Selectors.content);

    titleNode.innerText = title;
    contentNode.innerText = content;

    this.wrapper.appendChild(windowFragment);
    this.randomizeWindowPosition(windowNode);
  }

  randomizeWindowPosition(windowNode) {
    const {wrapper} = this;

    const windowWidth = windowNode.offsetWidth;
    const windowHeight = windowNode.offsetHeight;

    const wrapperWidth = wrapper.offsetWidth;
    const wrapperHeight = (wrapper.offsetHeight - this.startBarHeight);

    const windowFitsInWrapper = windowWidth <= wrapperWidth && windowHeight <= wrapperHeight;

    if (!windowFitsInWrapper) {
      return;
    }

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

  close(windowChildNode) {
    const {options: {Selectors}} = this;
    const windowNode = windowChildNode.closest(Selectors.window);
    windowNode.parentNode.removeChild(windowNode);
  }

  handleClick({target}) {
    const {options: {Selectors}} = this;
    if (target.matches(Selectors.closeButton)) {
      this.close(target);
    }
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
