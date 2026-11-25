// Builds public/wine/index.html from public/wine/llms.txt, so the agent
// instructions have a single source and /wine works for agents that only fetch HTML.
import fs from 'node:fs';

const src = 'public/wine/llms.txt';
const out = 'public/wine/index.html';
const text = fs.readFileSync(src, 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const linkify = (s) =>
  s.replace(/https:\/\/kvendrik\.com\/[^\s)&]*[^\s).,&]/g, (u) => `<a href="${u}">${u}</a>`);

const body = linkify(esc(text));
const description =
  'Instructions and data for an AI agent to recommend wine from a photo of a wine list, based on one drinker’s Vivino ratings.';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wine picker</title>
<meta name="description" content="${description}">
<link rel="canonical" href="https://kvendrik.com/wine/">
<link rel="alternate" type="text/plain" href="llms.txt" title="llms.txt">
<meta name="robots" content="noindex">
<style>
:root{--bg:#f7f5f2;--fg:#1d1b19;--muted:#6b645c;--link:#7a1f2b}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#161413;--fg:#e9e4de;--muted:#9a9189;--link:#e39aa4}}
:root[data-theme="dark"]{--bg:#161413;--fg:#e9e4de;--muted:#9a9189;--link:#e39aa4}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
main{max-width:760px;margin:0 auto;padding:32px 16px 64px}
p.note{color:var(--muted);margin:0 0 24px}
pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font:inherit}
a{color:var(--link)}
</style>
</head>
<body>
<main>
<p class="note">For AI agents. Plain-text version: <a href="llms.txt">llms.txt</a></p>
<pre>${body}</pre>
</main>
</body>
</html>
`;

fs.writeFileSync(out, html);
