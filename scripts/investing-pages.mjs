// Generates /investing/nl/index.html: the investing page with its Dutch text filled in,
// so Dutch readers, search engines and link previews get Dutch without waiting for the script.
// The English originals ride along as JSON, so switching language in place still works.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const dir = 'public/investing';
const src = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'i18n.js'), 'utf8'), ctx);
const I = ctx.window.I18N;
const NL = I.html.nl;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const EN = {};

// Swap the inner HTML of every element carrying data-t="key" (nested tags of the same name are counted).
function swapText(html) {
  const re = /data-t="([^"]+)"/g;
  let out = '';
  let pos = 0;
  let m;
  while ((m = re.exec(html))) {
    const key = m[1];
    const open = html.lastIndexOf('<', m.index);
    const tag = /^<([a-zA-Z0-9]+)/.exec(html.slice(open))[1];
    const innerStart = html.indexOf('>', m.index) + 1;
    const tagRe = new RegExp(`<(/?)${tag}(?=[\\s>])`, 'g');
    tagRe.lastIndex = innerStart;
    let depth = 1;
    let close;
    let t;
    while ((t = tagRe.exec(html))) {
      depth += t[1] ? -1 : 1;
      if (!depth) { close = t.index; break; }
    }
    if (close == null) throw new Error(`no closing </${tag}> for data-t="${key}"`);
    EN[key] = html.slice(innerStart, close);
    out += html.slice(pos, innerStart) + (NL[key] != null ? NL[key] : EN[key]);
    pos = close;
    re.lastIndex = close;
  }
  return out + html.slice(pos);
}

let html = swapText(src);
// attributes: data-ta="key@attr"
html = html.replace(/<[^>]*data-ta="([^"]+)"[^>]*>/g, (tagHtml, key) => {
  const attr = key.split('@')[1];
  return tagHtml.replace(new RegExp(`(\\s${attr}=")([^"]*)(")`), (_, a, value, b) => {
    EN[key] = value.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
    return NL[key] != null ? a + esc(NL[key]) + b : a + value + b;
  });
});

const url = 'https://kvendrik.com/investing/nl/';
const title = I.nl.title;
const description = I.nl.description;
const ogDescription = I.nl.ogDescription || description;
const setMeta = (h, attr, key, value) => h.replace(new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), (_, a, b) => a + esc(value) + b);
html = html
  .replace('<html lang="en">', '<html lang="nl">')
  .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`)
  .replace(/<link rel="canonical" href="[^"]*">/, () => `<link rel="canonical" href="${url}">`);
html = setMeta(html, 'name', 'description', description);
html = setMeta(html, 'property', 'og:url', url);
html = setMeta(html, 'property', 'og:title', title);
html = setMeta(html, 'property', 'og:description', ogDescription);
if (I.nl.ogImageAlt) html = setMeta(html, 'property', 'og:image:alt', I.nl.ogImageAlt);
html = setMeta(html, 'property', 'og:image', 'https://kvendrik.com/investing/og-nl.png');
html = html.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="website">\n<meta property="og:locale" content="nl_NL">');

const json = JSON.stringify(EN).replace(/</g, '\\u003c');
// (a function, so the $ signs in the English text aren't read as replacement patterns)
html = html.replace('<script src="/investing/returns.js', (m) => `<script type="application/json" id="i18n-en">${json}</script>\n${m}`);

fs.mkdirSync(path.join(dir, 'nl'), { recursive: true });
fs.writeFileSync(path.join(dir, 'nl', 'index.html'), html);
const missing = Object.keys(EN).filter((k) => NL[k] == null);
console.log(`investing/nl: ${Object.keys(EN).length} strings, ${missing.length} kept in English${missing.length ? ': ' + missing.join(', ') : ''}`);
