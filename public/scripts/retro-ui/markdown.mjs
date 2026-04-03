import markdownit from 'https://esm.sh/markdown-it@14';
import hljs from 'https://esm.sh/highlight.js@11';

const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre><code class="hljs">' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        );
      } catch (__) {}
    }
    return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>';
  },
});

md.block.ruler.before('paragraph', 'pipe_blockquote', (state, startLine, endLine, silent) => {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const line = state.src.slice(pos, state.eMarks[startLine]);
  if (!line.startsWith('| ')) return false;
  if (silent) return true;

  state.push('blockquote_open', 'blockquote', 1).map = [startLine, startLine + 1];
  const token = state.push('inline', '', 0);
  token.content = line.slice(2);
  token.map = [startLine, startLine + 1];
  token.children = [];
  state.push('blockquote_close', 'blockquote', -1);

  state.line = startLine + 1;
  return true;
});

md.renderer.rules['link_open'] = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank');
  return self.renderToken(tokens, idx, options);
};

// Inject retro md-tag spans for headings and bullet list items
// md.core.ruler.push('retro_ui_tags', (state) => {
//   const tokens = state.tokens;

//   for (let i = 0; i < tokens.length; i++) {
//     if (tokens[i].type === 'heading_open') {
//       const level = parseInt(tokens[i].tag[1]);
//       const hashes = '#'.repeat(level);
//       const inlineToken = tokens[i + 1];
//       if (inlineToken?.type === 'inline' && inlineToken.children) {
//         const tagToken = new state.Token('html_inline', '', 0);
//         tagToken.content = `<span class="md-tag">${hashes}</span> `;
//         inlineToken.children.unshift(tagToken);
//       }
//     }

//     if (tokens[i].type === 'list_item_open' && ['-', '*', '+'].includes(tokens[i].markup)) {
//       for (let j = i + 1; j < tokens.length && tokens[j].type !== 'list_item_close'; j++) {
//         if (tokens[j].type === 'inline' && tokens[j].children) {
//           const tagToken = new state.Token('html_inline', '', 0);
//           tagToken.content = `<span class="md-tag">-</span> `;
//           tokens[j].children.unshift(tagToken);
//           break;
//         }
//       }
//     }
//   }
// });

export function render(md_text) {
  return md.render(md_text);
}
