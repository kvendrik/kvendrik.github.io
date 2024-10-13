import DevServer from 'serve-dev';
import {buildHtml} from './build-tools.mjs';

new DevServer({
  root: './',
  port: 9000,
  watch: {
    paths: ['./src', './assets'],
    onChange(filePath) {
      if (filePath.includes('.html')) buildHtml();
      return { shouldReloadPage: true };
    }
  },
}).start()
