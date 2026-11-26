// Builds public/wine/index.html from scripts/wine-template.html, with the full agent
// instructions from public/wine/llms.txt written into the page. That way an agent that
// fetches /wine gets everything in one request, and llms.txt stays the single source.
import fs from 'node:fs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const llms = fs.readFileSync('public/wine/llms.txt', 'utf8');
const html = fs.readFileSync('scripts/wine-template.html', 'utf8').replace('__LLMS__', () => esc(llms));

fs.writeFileSync('public/wine/index.html', html);
