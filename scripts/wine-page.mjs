// Builds public/wine/index.html from scripts/wine-template.html:
// - writes the full agent instructions from public/wine/llms.txt into the page, so an agent
//   that fetches /wine gets everything in one request and llms.txt stays the single source;
// - renders Pablo's producer list from public/wine/producers.md and crosses off every producer
//   Koen has rated in public/wine/ratings.csv, with Koen's score.
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

// Pablo's sections and producers, in his order, from the tables in producers.md.
const sections = [];
for (const line of fs.readFileSync(`${DIR}/producers.md`, 'utf8').split('\n')) {
  const h = line.match(/^## (.+)/);
  if (h) { sections.push({ title: h[1].split(/[:,]/)[0].trim(), producers: [] }); continue; }
  const r = line.match(/^\| ([^|]+?) \| ★/);
  if (r && sections.length) sections.at(-1).producers.push(r[1].trim());
}

const display = (name) => name.replace(/\s*\(.*?\)/g, '');
function item(name, place = '') {
  const t = tried(name);
  const right = t
    ? `<span class="score" title="${esc(t.wine)}">${t.score}</span>`
    : place ? `<span>${esc(place)}</span>` : '';
  return `<li${t ? ' class="tried"' : ''}>${t ? `<s>${esc(display(name))}</s>` : esc(display(name))}${right}</li>`;
}

// The ones Koen starts with, shown before the full list.
const firstUp = [
  ['White', [['Hubert Lamy', 'Saint-Aubin'], ['Marc Colin', 'Saint-Aubin'], ['Paul Pillot', 'Chassagne'], ['Dureuil-Janthial', 'Rully']]],
  ['Red', [['Simon Bize', 'Savigny'], ['Chandon de Briailles', 'Savigny'], ['Berthaut-Gerbet', 'Fixin'], ['Georges Noëllat', 'Vosne']]],
  ['Lesser known', [['Claire Naudin', 'Hautes-Côtes'], ['Ami', 'Hautes-Côtes'], ['Domaine Rougeot', 'Meursault'], ['Génot-Boulanger', 'Meursault']]],
];

const all = new Map();
for (const s of sections) for (const p of s.producers) all.set(norm(display(p)), p);
const triedCount = [...all.values()].filter((p) => tried(p)).length;
const pabloHtml = `<div class="cols">
${firstUp.map(([h, ps]) => `      <div><h3>${esc(h)}</h3><ul>${ps.map(([p, a]) => item(p, a)).join('')}</ul></div>`).join('\n')}
    </div>
    <details class="all">
      <summary class="mono">Pablo’s full list (${all.size} producers, ${triedCount} tried)</summary>
      <p class="key">Crossed off means I’ve tried it, with my score.</p>
      <div class="full">
${sections.map((s) => `        <div><h3>${esc(s.title)}</h3><ul>${s.producers.map((p) => item(p)).join('')}</ul></div>`).join('\n')}
      </div>
    </details>`;

const llms = fs.readFileSync(`${DIR}/llms.txt`, 'utf8');
const html = fs.readFileSync('scripts/wine-template.html', 'utf8')
  .replace('__LLMS__', () => esc(llms).replace(/&quot;/g, '"'))
  .replace('__PABLO__', () => pabloHtml);

fs.writeFileSync(`${DIR}/index.html`, html);
