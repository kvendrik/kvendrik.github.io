export class Alert {
  constructor(windowsManager) {
    this.windowsManager = windowsManager;
  }

  spawn({title, content, parentWindow}) {
    const {windowsManager} = this;

    const template = document.getElementById('alert-template');
    const {content: fragment} = template.cloneNode(true);

    const contentNode = fragment.querySelector('[data-content]');
    contentNode.innerHTML = content;

    const window = windowsManager.create({
      content: fragment,
      variant: 'alert',
    });

    window.content.querySelector('[data-confirm]').addEventListener(
      'click', 
      () => window.close(),
    );

    window.setTitle(title);
    window.show({parentWindow});
    window.moveToTop();
  }
}