import fs from 'node:fs';
import path from 'node:path';

removeAllHtmlInDir('public');

const indexSrc = fs.readFileSync('src/index.html', 'utf8');
const files = fs.readdirSync('public/entries');

const buttons: string[] = [];
const pages: {title: string, content: string}[] = [];

for (const entry of files) {
  if (!entry.endsWith('.md')) {
    continue;
  }
  const filePath = path.relative(process.cwd(), path.join('entries', entry));
  buttons.push(`<button data-desktop-item class="desktop__item" data-id="${entry}" data-notepad-content-path="${filePath}"><div>${entry}</div></button>`);
  pages.push({title: entry, content: fs.readFileSync(path.join('public', 'entries', entry), 'utf8')});
}

const blank = indexSrc
  .replace('{bio}', '<button data-desktop-item class="desktop__item" data-id="koen.txt" data-notepad-content-path="/bio.md"><div>koen.txt</div></button>')
  .replace('{articles}', buttons.join('\n'))
  .replace(/\n\s{2,}/g, '')
  .replaceAll('{unix}', new Date().getTime().toString());

fs.writeFileSync('public/index.html', blank.replace('{window}', createWindow('koen.txt', fs.readFileSync('public/bio.md', 'utf8'))));

for (const {title, content} of pages) {
  const entryHtml = blank.replace('{window}', createWindow(title, content));
  fs.writeFileSync(`public/${title}.html`, entryHtml);
}

function removeAllHtmlInDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isFile() && name.name.endsWith('.html')) {
      fs.unlinkSync(full);
    }
  }
}

function createWindow(title: string, content: string) {
  return `
    <div class="window" data-window role="dialog" aria-modal="true" data-id="${title}">
      <div class="window__title-bar" data-title-bar>
        <span data-title>${title}</span>
        <button class="button button--icon" data-close-button aria-label="Close window">X</button>
      </div>
      <div class="window__content" data-content>${content}</div>
    </div>
  `;
}