import {readFileSync, writeFileSync} from 'fs';
import minify from 'html-minifier';

export function buildHtml() {
  const source = readFileSync('src/index.html', 'utf-8')
    .replace('{cacheBustHash}', Math.random().toString(36).substring(7));

  const html = minify.minify(source, {
    collapseWhitespace: true
  });

  writeFileSync('index.html', html);
}