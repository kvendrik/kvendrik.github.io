import markdownit from 'https://esm.sh/markdown-it@14';

const md = markdownit({ html: true });

// Inject retro md-tag spans for headings and bullet list items
md.core.ruler.push('retro_ui_tags', (state) => {
  const tokens = state.tokens;

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'heading_open') {
      const level = parseInt(tokens[i].tag[1]);
      const hashes = '#'.repeat(level);
      const inlineToken = tokens[i + 1];
      if (inlineToken?.type === 'inline' && inlineToken.children) {
        const tagToken = new state.Token('html_inline', '', 0);
        tagToken.content = `<span class="md-tag">${hashes}</span> `;
        inlineToken.children.unshift(tagToken);
      }
    }

    if (tokens[i].type === 'list_item_open' && ['-', '*', '+'].includes(tokens[i].markup)) {
      for (let j = i + 1; j < tokens.length && tokens[j].type !== 'list_item_close'; j++) {
        if (tokens[j].type === 'inline' && tokens[j].children) {
          const tagToken = new state.Token('html_inline', '', 0);
          tagToken.content = `<span class="md-tag">-</span> `;
          tokens[j].children.unshift(tagToken);
          break;
        }
      }
    }
  }
});

export function render(md_text) {
  return md.render(md_text);
}
