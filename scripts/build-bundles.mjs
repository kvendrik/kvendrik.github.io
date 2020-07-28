import {execSync} from 'child_process';
import sass from 'node-sass';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import {readFileSync, writeFileSync} from 'fs';
import minify from 'html-minifier';

export function prepare() {
  execShell('mkdir -p public');
}

export function buildScripts() {
  execShell('rm -rf public/*.js && cp -R src/scripts/* public');
}

export async function buildStyles({sourceMap}) {
  const cssOutputPath = 'public/main.css';
  const mapOutputPath = 'public/main.css.map';

  if (!sourceMap) {
    execShell(`rm -rf ${mapOutputPath}`);
  }

  const {css, map} = sass.renderSync({
    file: 'src/styles/main.scss',
    outputStyle: 'compressed',
    outFile: cssOutputPath,
    sourceMap,
  });

  const {css: finalCss} = await postcss([autoprefixer]).process(css, {from: 'src/styles/main.scss'});
  writeFileSync(cssOutputPath, sourceMap ? `${finalCss}\n\n/*# sourceMappingURL=/public/main.css.map */` : finalCss);

  if (sourceMap) {
    writeFileSync(mapOutputPath, map);
  }
}

export function buildHtml() {
  const html = minify.minify(readFileSync('src/index.html', 'utf-8'), {
    collapseWhitespace: true
  });
  writeFileSync('index.html', html);
}

function execShell(command) {
  execSync(command, {stdio: 'inherit'});
}
