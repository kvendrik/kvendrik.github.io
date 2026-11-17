// Names the article title that takes part in the page transition (see transitions.css).
// On the home page: the title you click, or, when you come back from an article, that
// article's title. Only one element may carry the name at a time.
(() => {
  const NAME = 'article-title';
  const titles = () => document.querySelectorAll('.articles a[href] .title');
  const clear = () => titles().forEach((t) => (t.style.viewTransitionName = ''));
  const nameFor = (url) => {
    const path = new URL(url, location.href).pathname;
    for (const t of titles()) {
      if (new URL(t.closest('a').href).pathname === path) return t;
    }
    return null;
  };

  // Leaving for an article, in three beats:
  // 1. everything but the clicked title fades out (the title is pinned where it is),
  // 2. the page jumps to the top while nothing else is visible, so it doesn't feel scrolled,
  // 3. the page transition then glides the title to the article's heading as the article fades in.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let flying = null;
  const cleanup = () => {
    root.classList.remove('vt-leaving');
    flying?.remove();
    flying = null;
    titles().forEach((t) => (t.style.visibility = ''));
    clear();
  };
  const root = document.documentElement;

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.articles a[href]');
    if (!link || link.getAttribute('href') === '#' || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
    if (root.classList.contains('edit-mode')) return; // in edit mode a click selects instead
    clear();
    const title = link.querySelector('.title');
    if (!title) return;
    if (reduce.matches) {
      title.style.viewTransitionName = NAME;
      return; // let the browser navigate with the plain crossfade
    }
    e.preventDefault();

    // a stand-in for the title, fixed where it is now, so it can stay put while the page moves
    const r = title.getBoundingClientRect();
    const cs = getComputedStyle(title);
    flying = document.createElement('div');
    flying.className = 'vt-flying';
    flying.textContent = title.textContent;
    Object.assign(flying.style, {
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${Math.ceil(r.width) + 1}px`,
      font: cs.font,
      fontVariationSettings: cs.fontVariationSettings,
      letterSpacing: cs.letterSpacing,
      color: cs.color,
      opacity: cs.opacity,
      viewTransitionName: NAME,
    });
    // the list may be scaled by the scroll effect: match the title's on-screen size
    const scale = r.width / title.offsetWidth || 1;
    if (Math.abs(scale - 1) > 0.01) {
      flying.style.width = `${title.offsetWidth + 1}px`;
      flying.style.transformOrigin = '0 0';
      flying.style.scale = scale;
    }
    document.body.append(flying);
    title.style.visibility = 'hidden';
    root.classList.add('vt-leaving');

    setTimeout(() => {
      scrollTo({ top: 0, behavior: 'instant' });
      requestAnimationFrame(() => (location.href = link.href));
    }, 240);
  });

  // arriving back from an article: its heading flies back into the list
  addEventListener('pagereveal', (e) => {
    const from = window.navigation?.activation?.from?.url;
    if (!e.viewTransition || !from) return;
    clear();
    const title = nameFor(from);
    // only when the title is on screen; otherwise the heading would fly off the edge
    const r = title?.getBoundingClientRect();
    if (title && r.bottom > 0 && r.top < innerHeight) title.style.viewTransitionName = NAME;
    e.viewTransition.finished.finally(clear);
  });

  // coming back through the browser's back button restores this page from cache: tidy up
  addEventListener('pageshow', (e) => e.persisted && cleanup());
})();
