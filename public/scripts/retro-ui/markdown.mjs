export function render(md) {
    return md.split('\n\n').map(block => `<p>${renderBlock(block)}</p>`).join('');
}

function renderBlock(block) {
  let finalBlock = block.replace(/^(#{1,6})\s+(.*)$/gm, '<span class="md-tag">$1</span> $2');
  finalBlock = finalBlock.replace(/^(>)\s+(.*)$/gm, '<span class="md-tag">$1</span> $2');
  finalBlock = finalBlock.replace(/^(```([a-z]+)?)/gm, '<span class="md-tag">$1</span>');
  finalBlock = finalBlock.replace(/^((\d+\.)|-)/gm, '<span class="md-tag">$1</span>');
  finalBlock = finalBlock.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img alt="$1" src="$2" />',
  );
  finalBlock = finalBlock.replace(
    /\[([^\]]*)\]\(([^)]+)\)/g,
    '<a href="$2">$1</a>',
  );
  finalBlock = finalBlock.replace(/~~([\s\S]+?)~~/g, '<s>$1</s>');
  finalBlock = finalBlock.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
  finalBlock = finalBlock.replace(/__([\s\S]+?)__/g, '<strong>$1</strong>');
  finalBlock = finalBlock.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');
  finalBlock = finalBlock.replace(/_([\s\S]+?)_/g, '<em>$1</em>');
  return finalBlock;
}