export class Browser {
  constructor(programsManager) {
    this.programsManager = programsManager;
  }

  spawn({title, url}) {
    const {windowsManager} = this.programsManager;

    const template = document.getElementById('browser-template');
    const {content: fragment} = template.cloneNode(true);

    fragment.querySelector('iframe').src = url;
    fragment.querySelector('[data-url]').innerText = url;

    const window = windowsManager.spawn({
      title, 
      content: fragment,
      variant: 'large',
    });

    window.moveToTop();
  }
}