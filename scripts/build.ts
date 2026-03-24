import fs from 'node:fs';
import path from 'node:path';

const indexSrc = fs.readFileSync('src/index.html', 'utf8');
const files = fs.readdirSync('public/entries');

const buttons: string[] = [];
const pages: {title: string, content: string}[] = [];

for (const entry of files) {
  const filePath = path.relative(process.cwd(), path.join('entries', entry));
  buttons.push(`<button data-desktop-item class="desktop__item" data-id="${entry}" data-notepad-content-path="${filePath}"><div>${entry}</div></button>`);
  pages.push({title: entry, content: fs.readFileSync(path.join('public', 'entries', entry), 'utf8')});
}

const blank = indexSrc.replace('{articles}', buttons.join('\n')).replace(/\n\s{2,}/g, '');
fs.writeFileSync('public/index.html', blank.replace('{window}', ''));

for (const {title, content} of pages) {
  const entryHtml = blank.replace('{window}', `
    <div class="window" data-window role="dialog" aria-modal="true" data-id="${title}">
      <div class="window__title-bar" data-title-bar>
        <span data-title>${title}</span>
        <button class="button button--icon" data-close-button aria-label="Close window">X</button>
      </div>
      <div class="window__content" data-content>${content}</div>
    </div>
  `);
  fs.writeFileSync(`public/${title}.html`, entryHtml.replace(/\n\s{2,}/g, ''));
}