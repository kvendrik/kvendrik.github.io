export class Notepad {
  constructor(programsManager) {
    this.programsManager = programsManager;
  }

  spawn({title, content}) {
    const {programsManager} = this;
    const {windowsManager} = programsManager;

    const template = document.getElementById('notepad-template');
    const {content: fragment} = template.cloneNode(true);

    const contentNode = fragment.querySelector('[data-content]');

    contentNode.innerHTML = content;
    contentNode.addEventListener('click', ({target}) => {
      if (target.dataset.program != null) {
        programsManager.open(target.dataset);
      }
    });

    const window = windowsManager.spawn({title, content: fragment});
    window.moveToTop();
  }
}