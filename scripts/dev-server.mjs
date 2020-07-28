import DevServer from 'serve-dev';
import {prepare, buildScripts, buildStyles, buildHtml} from './build-bundles.mjs';

new DevServer({
  root: './',
  port: 9000,
  watch: {
    paths: ['src'],
    onChange(filePath) {
      prepare();
      if (filePath.includes('.html')) buildHtml();
      if (filePath.includes('.mjs')) buildScripts();
      if (filePath.includes('.scss')) buildStyles({sourceMap: true});
      return {shouldReloadPage: true};
    }
  },
}).start()
