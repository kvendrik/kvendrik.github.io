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

    const window = windowsManager.create({content: fragment});
    window.setTitle(title);
    window.show();
    window.moveToTop();
  }
}