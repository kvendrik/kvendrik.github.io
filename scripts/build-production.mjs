import {prepare, buildScripts, buildStyles, buildHtml} from './build-bundles.mjs';

(async () => {
  prepare();
  buildScripts();
  await buildStyles({sourceMap: false});
  buildHtml();
})();
