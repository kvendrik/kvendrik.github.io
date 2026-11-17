// The pen underline sits under a title's last line, as wide as that line. A wrapped title's box
// is wider than its last line, so measure the text and hand the line to the CSS (pen.css).
(() => {
  const sizePen = (el) => {
    if (!el?.firstChild) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const lines = [...range.getClientRects()].filter((r) => r.width > 0);
    const last = lines[lines.length - 1];
    if (!last) return;
    const box = el.getBoundingClientRect();
    const scale = box.width / el.offsetWidth || 1; // the list may be scaled by the scroll effect
    el.style.setProperty('--pen-left', `${(last.left - box.left) / scale}px`);
    el.style.setProperty('--pen-width', `${last.width / scale}px`);
  };
  const sizeAllPens = () => document.querySelectorAll('.articles .title, .article h1, .title-demo').forEach(sizePen);
  addEventListener('DOMContentLoaded', sizeAllPens);
  addEventListener('load', sizeAllPens);
  addEventListener('resize', sizeAllPens);
  document.fonts?.ready.then(sizeAllPens);
})();
