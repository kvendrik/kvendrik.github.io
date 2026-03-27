export function render(md) {
  return md
    .split('\n\n')
    .map((block) => renderBlock(block))
    .join('');
}

function renderBlock(block) {
  const headingMatch = block.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    const [, hashes, content] = headingMatch;
    const level = hashes.length;
    return `<h${level}><span class="md-tag">${hashes}</span> ${renderInline(content)}</h${level}>`;
  }

  const codeFenceMatch = block.match(/^```([a-z]+)?\n([\s\S]*?)\n```$/);
  if (codeFenceMatch) {
    const [, language = '', code] = codeFenceMatch;
    const className = language ? ` class="language-${language}"` : '';
    return `<pre><code${className}>${escapeHtml(code)}</code></pre>`;
  }

  if (/^(>\s?.*(\n|$))+$/m.test(block)) {
    const quoteContent = block
      .split('\n')
      .map((line) => line.replace(/^>\s?/, ''))
      .map((line) => renderInline(line))
      .join('<br />');
    return `<blockquote>${quoteContent}</blockquote>`;
  }

  if (/^(\d+\.\s+.+(\n|$))+$/m.test(block)) {
    const items = block
      .split('\n')
      .map((line) => line.replace(/^\d+\.\s+/, ''))
      .map((line) => `<li>${renderInline(line)}</li>`)
      .join('');
    return `<ol>${items}</ol>`;
  }

  if (/^(-\s+.+(\n|$))+$/m.test(block)) {
    const items = block
      .split('\n')
      .map((line) => line.replace(/^-\s+/, ''))
      .map((line) => `<li><span class="md-tag">-</span> ${renderInline(line)}</li>`)
      .join('');
    return `<ul>${items}</ul>`;
  }

  return `<p>${renderInline(block)}</p>`;
}

function renderInline(text) {
  return text
    .split(/(<[^>]+>)/g)
    .map((segment) => {
      if (segment.startsWith('<') && segment.endsWith('>')) {
        return segment;
      }
      return renderInlineMarkdown(segment);
    })
    .join('');
}

function renderInlineMarkdown(text) {
  let finalText = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
  finalText = finalText.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_match, label, target) => {
    return `<a href="${target}">${label}</a>`;
  });
  finalText = finalText.replace(/~~([\s\S]+?)~~/g, '<s>$1</s>');
  finalText = finalText.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
  finalText = finalText.replace(/__([\s\S]+?)__/g, '<strong>$1</strong>');
  finalText = finalText.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');
  finalText = finalText.replace(/_([\s\S]+?)_/g, '<em>$1</em>');
  return finalText;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(text) {
  return escapeHtml(text).replace(/"/g, '&quot;');
}
