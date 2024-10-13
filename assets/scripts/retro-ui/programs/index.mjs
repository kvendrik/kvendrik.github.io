import {Notepad} from "./Notepad.mjs";
import {Browser} from "./Browser.mjs";

export class ProgramsManager {
  constructor(windowsManager) {
    this.windowsManager = windowsManager;
  }

  open({program, ...options}) {
    switch (program) {
      case 'notepad':
        const notepadWindow = new Notepad(this);
        notepadWindow.spawn({title: options.title, content: options.content});
        break;
      case 'browser':
        const browserWindow = new Browser(this);
        browserWindow.spawn({title: options.title, url: options.url});
        break;
      default:
        throw new Error(`Unrecognized program ‘${program}‘`);
    }
  }
}