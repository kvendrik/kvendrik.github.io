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

  // leaving for an article: the clicked title flies to the article's heading
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.articles a[href]');
    if (!link || link.getAttribute('href') === '#' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    clear();
    const title = link.querySelector('.title');
    if (title) title.style.viewTransitionName = NAME;
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
  addEventListener('pageshow', (e) => e.persisted && clear());
})();
