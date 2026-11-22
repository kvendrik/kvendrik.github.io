// Generates /philosophy/<slug>/index.html for every tradition, so each card
// has a real URL with its own title and share description.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const dir = 'public/philosophy';
const ctx = { window: {} };
ctx.window.window = ctx.window;
vm.createContext(ctx);
for (const f of ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'slugs']) {
  vm.runInContext(fs.readFileSync(path.join(dir, `${f}.js`), 'utf8').replace(/^T\.push/m, 'window.T.push'), ctx);
}
const T = ctx.window.T;
const SLUG = ctx.window.SLUG;
const template = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const setMeta = (html, attr, key, value) =>
  html.replace(new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), `$1${esc(value)}$2`);

// Remove stale generated pages, then write fresh ones.
for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  if (entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'index.html'))) {
    fs.rmSync(path.join(dir, entry.name), { recursive: true });
  }
}

for (const t of T) {
  const slug = SLUG[t.id];
  const url = `https://kvendrik.com/philosophy/${slug}/`;
  const title = `${t.name} · The Same Loss`;
  const description = `Someone loses their job. ${t.name}: ${t.insight}`;
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'property', 'og:url', url);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  fs.mkdirSync(path.join(dir, slug), { recursive: true });
  fs.writeFileSync(path.join(dir, slug, 'index.html'), html);
}
console.log(`philosophy: wrote ${T.length} pages`);
