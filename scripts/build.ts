import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const HEAD_DEFAULTS = {
  title: 'Koen Vendrik - Product Engineer',
  description: 'Product Engineer who spends his time thinking about AI.',
  image: 'https://kvendrik.com/kvendrik-og.png',
};

removeAllHtmlInDir('public');

const indexSrc = fs.readFileSync('src/index.html', 'utf8');
const files = fs.readdirSync('public/writing');

const buttons: string[] = [];
const pages: { title: string; content: string }[] = [];

for (const entry of files) {
  if (!entry.endsWith('.md')) {
    continue;
  }
  const filePath = path.relative(process.cwd(), path.join('writing', entry));
  buttons.push(
    `<button data-desktop-item class="desktop__item" data-id="${entry}" data-title="${entry}" data-notepad-content-path="${filePath}" data-size="large" data-kind="article"><div>${entry}</div></button>`,
  );
  pages.push({
    title: entry,
    content: fs.readFileSync(path.join('public/writing', entry), 'utf8'),
  });
}

let blank = indexSrc
  .replace(
    '{bio}',
    '<button data-desktop-item class="desktop__item" data-id="koen.txt"  data-title="koen.txt" data-notepad-content-path="/bio.md"><div>koen.txt</div></button>',
  )
  .replace('{articles}', buttons.join('\n'))
  .replace(/\n\s{2,}/g, '')
  .replaceAll('{unix}', new Date().getTime().toString());

const bioWindow = createWindow('koen.txt', fs.readFileSync('public/bio.md', 'utf8'));
writeHome();

for (const { title: filename, content } of pages) {
  const parsed = matter(content);
  const { title, description, image } = parsed.data;
  let blogEntry = blank;
  for (const [key, value] of Object.entries(getHead({ title, description, image }))) {
    blogEntry = blogEntry.replaceAll(`{{${key}}}`, value);
  }
  blogEntry = blogEntry.replace('{window}', bioWindow + createWindow(filename, content, 'article'));
  fs.writeFileSync(`public/${filename}.html`, blogEntry);
}

function getHead(opts: { title?: string; description?: string; image?: string } = {}) {
  const title = opts.title ? `${HEAD_DEFAULTS.title} | ${opts.title}` : HEAD_DEFAULTS.title;
  const description = opts.description ? opts.description : HEAD_DEFAULTS.description;
  const image = opts.image ? `https://kvendrik.com${opts.image}` : HEAD_DEFAULTS.image;

  return {
    ...HEAD_DEFAULTS,
    title,
    description,
    image,
  };
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

function writeHome() {
  let home = blank;
  for (const [key, value] of Object.entries(getHead())) {
    home = home.replaceAll(`{{${key}}}`, value);
  }
  home = home.replace('{window}', bioWindow);
  fs.writeFileSync('public/index.html', home);
}

function createWindow(title: string, content: string, kind: 'normal' | 'article' = 'normal') {
  return `
    <div class="window ${kind === 'article' ? 'window--large' : ''}" data-window role="dialog" aria-modal="true" data-id="${title}" data-title="${title}" hidden>
      <div class="window__title-bar" data-title-bar>
        <span data-title>${title}</span>
        <button class="button button--icon" data-close-button aria-label="Close window">X</button>
      </div>
      <div class="window__content" data-content>${kind === 'article' ? `<article>${content}</article>` : content}</div>
    </div>
  `;
}
