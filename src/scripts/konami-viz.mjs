export default class KonamiCodeViz {
  konamiCode = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowright', 'arrowright', 'arrowleft', 'arrowleft', 'b', 'a'];
  currentSequenceIndex = 0;
  keyElements = null;
  handleComplete = null;
  options = {}

  constructor(wrapper, options = {
    Classes: {
      key: 'konami-viz__key',
      keyCompleted: 'konami-viz__key--is-completed',
      keyPressed: 'konami-viz__key--is-pressed',
    },
  }) {
    this.keyElements = wrapper.querySelectorAll(`.${options.Classes.key}`);
    this.options = options;
  }

  bindEvents() {
    document.addEventListener('keyup', this.handleKeyEvent.bind(this));
  }

  onComplete(callback) {
    this.handleComplete = callback;
  }

  handleKeyEvent({key}) {
    const lowercaseKey = key.toLowerCase();
    const nextExpectedKey = this.konamiCode[this.currentSequenceIndex];
    const {Classes} = this.options;

    if (lowercaseKey !== nextExpectedKey) {
      this.reset(lowercaseKey);
      return;
    }

    this.keyElements[this.currentSequenceIndex].classList.add(Classes.keyCompleted);

    if (this.currentSequenceIndex === (this.konamiCode.length - 1) && this.handleComplete) {
      this.handleComplete();
      this.reset();
      return;
    }

    this.currentSequenceIndex += 1;
  }

  reset(highlightKey = null) {
    const {Classes} = this.options;

    for (const [index, keyNode] of this.keyElements.entries()) {
      const key = this.konamiCode[index];

      if (key === highlightKey) {
        keyNode.classList.remove(Classes.keyPressed);
        // hacky manual reflow trigger
        // https://css-tricks.com/restart-css-animation/
        void keyNode.offsetWidth;
        keyNode.classList.add(Classes.keyPressed);
      }

      keyNode.classList.remove(Classes.keyCompleted);
    }

    this.currentSequenceIndex = 0;
  }
}
