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
      // copied one by one: the font shorthand comes back empty for this variable font
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      lineHeight: cs.lineHeight,
      fontVariationSettings: cs.fontVariationSettings,
      letterSpacing: cs.letterSpacing,
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
    flying.style.setProperty('--pen-left', title.style.getPropertyValue('--pen-left'));
    flying.style.setProperty('--pen-width', title.style.getPropertyValue('--pen-width'));
    title.style.visibility = 'hidden';
    root.classList.add('vt-leaving');
    requestAnimationFrame(() => flying?.classList.add('is-lifted'));
    // one short beat for the page to warm to cream; the article is usually preloaded already,
    // so this is the only wait
    setTimeout(() => (location.href = link.href), 180);
  });

  // Going back from an article to the home page is a sideways move: the article slides off
  // to the right (shrinking a little as it fades) and the home page comes in from the left.
  // (loaded in <head>, so it's listening before the first paint: look the page up lazily)
  const isArticle = () => !!document.querySelector('.article');
  const isArticleUrl = (url) => !!url && new URL(url, location.href).pathname.includes('/writing/');

  // on the article, as it's left for a page that isn't another article
  addEventListener('pageswap', (e) => {
    if (!isArticle() || !e.viewTransition) return;
    const to = e.activation?.entry?.url;
    if (!to || isArticleUrl(to)) return;
    e.viewTransition.types.add('back');
    // the whole article moves as one, title included
    const h1 = document.querySelector('.article h1');
    if (h1) h1.style.viewTransitionName = 'none';
  });

  // on the home page, as it's reached from an article
  addEventListener('pagereveal', (e) => {
    const from = window.navigation?.activation?.from?.url;
    if (isArticle() || !e.viewTransition || !isArticleUrl(from)) return;
    clear();
    e.viewTransition.types.add('back');
  });

  // The pen underline sits under a title's last line, as wide as that line. A wrapped title's
  // box is wider than its last line, so measure the text and hand the line to the CSS.
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
  const sizeAllPens = () => document.querySelectorAll('.articles .title, .article h1').forEach(sizePen);
  addEventListener('DOMContentLoaded', sizeAllPens);
  addEventListener('load', sizeAllPens);
  addEventListener('resize', sizeAllPens);
  document.fonts?.ready.then(sizeAllPens);
  // after writing (the title may have changed)
  new MutationObserver(() => !root.classList.contains('writing-mode') && sizeAllPens()).observe(root, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // Preload an article as soon as its title is hovered or focused, so the click has nothing to
  // wait for: Chrome renders it fully in the background, other browsers fetch it.
  const preloaded = new Set();
  const preload = (e) => {
    const link = e.target.closest?.('.articles a[href]');
    if (!link || link.getAttribute('href') === '#' || preloaded.has(link.href)) return;
    preloaded.add(link.href);
    if (HTMLScriptElement.supports?.('speculationrules')) {
      const rules = document.createElement('script');
      rules.type = 'speculationrules';
      rules.textContent = JSON.stringify({ prerender: [{ source: 'list', urls: [link.href] }] });
      document.head.append(rules);
    } else {
      const hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.href = link.href;
      document.head.append(hint);
    }
  };
  document.addEventListener('pointerover', preload, { passive: true });
  document.addEventListener('focusin', preload);
  document.addEventListener('touchstart', preload, { passive: true });

  // coming back through the browser's back button restores this page from cache: tidy up
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    cleanup();
    const h1 = document.querySelector('.article h1');
    if (h1) h1.style.viewTransitionName = ''; // ready to take part in the next transition again
  });
})();
