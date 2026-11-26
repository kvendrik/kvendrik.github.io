// Builds public/wine/index.html from scripts/wine-template.html:
// - writes the full agent instructions from public/wine/llms.txt into the page, so an agent
//   that fetches /wine gets everything in one request and llms.txt stays the single source;
// - renders "Wines I want to try": Koen's Vivino wishlist, then Pablo's producers from producers.md
//   (tagged), crossing off anything Koen has rated in public/wine/ratings.csv, with the score.
import fs from 'node:fs';

const DIR = 'public/wine';
const RATINGS = process.env.WINE_RATINGS || `${DIR}/ratings.csv`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const norm = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const ratings = parseCsv(fs.readFileSync(RATINGS, 'utf8'));

// The names a producer goes by: "Sextant / Julien Altaber" -> both; drop "(...)" and a leading Domaine/Maison.
function aliases(name) {
  return name.replace(/\(.*?\)/g, '').split('/').map((n) => norm(n).replace(/^(domaine|maison) /, '')).filter((n) => n.length > 2);
}

// Koen's best rating for a producer, or null. Matches whole words in the winery name only.
function tried(name) {
  const hits = ratings.filter((r) => {
    const w = ` ${norm(r.winery)} `;
    return aliases(name).some((a) => w.includes(` ${a} `));
  });
  if (!hits.length) return null;
  const best = hits.reduce((a, b) => (parseFloat(b.my_rating) > parseFloat(a.my_rating) ? b : a));
  return { score: parseFloat(best.my_rating).toFixed(1), wine: `${best.winery} ${best.wine} ${best.vintage}`.trim() };
}

// Pablo's producers, once each, in his order, from the tables in producers.md.
const display = (name) => name.replace(/\s*\(.*?\)/g, '').trim();
const pablo = new Map();
for (const line of fs.readFileSync(`${DIR}/producers.md`, 'utf8').split('\n')) {
  const r = line.match(/^\| ([^|]+?) \| ★/);
  if (r) pablo.set(norm(display(r[1])), display(r[1]));
}

// Koen's Vivino wishlist; a wishlisted wine Koen has since rated is crossed off with that score.
const wishlist = parseCsv(fs.readFileSync(`${DIR}/wishlist-and-cellar.csv`, 'utf8')).filter((w) => w.list === 'wishlist');
function triedWine(w) {
  const hit = ratings.find((r) => norm(r.winery) === norm(w.winery) && norm(r.wine) === norm(w.wine));
  return hit ? parseFloat(hit.my_rating).toFixed(1) : null;
}

const sortKey = (s) => norm(s).replace(/^(domaine|maison|chateau|r) /, '');
function li(name, sub, score, fromPablo) {
  const label = `<b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
  const right = `${fromPablo ? '<span class="tag">Pablo</span>' : ''}${score ? `<span class="score">${score}</span>` : ''}`;
  return `<li class="${score ? 'tried' : ''}"><span class="nm">${score ? `<s>${label}</s>` : label}</span><span class="rt">${right}</span></li>`;
}
const own = [...wishlist].sort((a, b) => sortKey(a.winery).localeCompare(sortKey(b.winery)))
  .map((w) => li(w.winery, w.wine, triedWine(w), false));
const fromPablo = [...pablo.values()].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  .map((p) => li(p, '', tried(p)?.score, true));
const tryHtml = `<ul class="try">${own.join('')}</ul>
    <details class="all">
      <summary class="mono">Show Pablo’s ${fromPablo.length} producers</summary>
      <ul class="try">${fromPablo.join('')}</ul>
    </details>`;

const llms = fs.readFileSync(`${DIR}/llms.txt`, 'utf8');
const html = fs.readFileSync('scripts/wine-template.html', 'utf8')
  .replace('__LLMS__', () => esc(llms).replace(/&quot;/g, '"'))
  .replace('__TRY__', () => tryHtml);

fs.writeFileSync(`${DIR}/index.html`, html);
