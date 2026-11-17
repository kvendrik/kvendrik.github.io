// Page transitions between the home page and the articles. Each page animates itself, so they
// work however the page change happens (a normal site, or the claude.ai preview, which loads
// pages its own way):
// - Opening an article: a circle of the article's cream grows out of the clicked title and
//   covers the page (no fading through grey), the title turning from cream to ink as it's
//   covered. The article page starts in exactly that state: the title glides from where it was
//   into its heading, and the rest of the article rises in.
// - Back home (the back arrow, or the browser's back button): it all happens on black, where
//   you're going. The article slides off to the right, shrinking a little as it fades, and home
//   comes in from the left, at the exact spot in the list you left from.
// The two pages hand over through sessionStorage: what's happening, and where the title was.
// Loaded in <head>, so a page can set up its starting state before anything is painted.
(() => {
  const root = document.documentElement;
  const KEY = 'page-transition';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isArticle = () => !!document.querySelector('.article');
  const titles = () => document.querySelectorAll('.articles a[href] .title');

  const handOver = (data) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ ...data, at: Date.now() }));
    } catch {}
  };
  // The hand-over also rides along in the address (#pt=...), in case storage is blocked, as it
  // can be inside an embedded viewer. The address is tidied straight after.
  const withHandOver = (url, data) => {
    const u = new URL(url, location.href);
    u.hash = 'pt=' + encodeURIComponent(JSON.stringify(data));
    return u.href;
  };
  const takeOver = () => {
    let data = null;
    const m = location.hash.match(/^#pt=(.+)$/);
    if (m) {
      try {
        data = JSON.parse(decodeURIComponent(m[1]));
      } catch {}
      try {
        history.replaceState(history.state, '', location.pathname + location.search);
      } catch {}
    }
    try {
      const stored = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      sessionStorage.removeItem(KEY);
      // only a fresh hand-over counts (a reload later shouldn't replay it)
      if (!data && stored && Date.now() - stored.at < 4000) data = stored;
    } catch {}
    return data;
  };
  const homeUrl = () => {
    try {
      const saved = sessionStorage.getItem('home-url');
      if (saved) return saved;
    } catch {}
    // otherwise the page you came from, if it's on this site and not another article
    try {
      const ref = new URL(document.referrer);
      if (ref.origin === location.origin && !ref.pathname.includes('/writing/')) return ref.href.split('#')[0];
    } catch {}
    return null;
  };

  // run fn as soon as the element it needs exists (in a frame callback, so before it's painted)
  const whenReady = (selector, fn) => {
    const tick = () => (document.querySelector(selector) ? fn() : requestAnimationFrame(tick));
    tick();
  };
  const play = (cls, ms) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        root.classList.add('pt-play');
        setTimeout(() => root.classList.remove(cls, 'pt-play'), ms);
      }),
    );

  // ---------------------------------------------------------------- the pen underline
  // It sits under a title's last line, as wide as that line. A wrapped title's box is wider
  // than its last line, so measure the text and hand the line to the CSS.
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

  // ---------------------------------------------------------------- arriving on a page
  const arriving = reduce ? null : takeOver();
  // the article remembers where in the list you came from, to take you back there
  const cameFromScroll = arriving?.type === 'open' ? arriving.scroll : null;
  const homeScroll = () => {
    if (typeof cameFromScroll === 'number') return cameFromScroll;
    try {
      const s = sessionStorage.getItem('home-scroll');
      if (s != null) return Number(s);
    } catch {}
    return null;
  };

  if (arriving?.type === 'open') {
    // the article starts as the home page ended: cream, the title where it was, nothing else
    root.classList.add('pt-arrive-article');
    whenReady('.article .body', () => {
      const h1 = document.querySelector('.article h1');
      sizePen(h1);
      const r = h1.getBoundingClientRect();
      const from = arriving.title;
      h1.style.translate = `${from.left - r.left}px ${from.top - r.top}px`;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          // then it glides into its heading and the rest rises in
          root.classList.add('pt-play');
          h1.style.translate = '';
          setTimeout(() => root.classList.remove('pt-arrive-article', 'pt-play'), 1000);
        }),
      );
    });
  } else if (arriving?.type === 'back') {
    root.classList.add('pt-arrive-back', 'pt-skip-intro');
    whenReady('.writing', () => {
      // back to the spot in the list you left from
      if (typeof arriving.scroll === 'number') scrollTo({ top: arriving.scroll, behavior: 'instant' });
      play('pt-arrive-back', 600);
    });
  }

  // ---------------------------------------------------------------- leaving the home page
  let flying = null;
  const cleanup = () => {
    root.classList.remove('pt-leave-home', 'pt-leave-article', 'pt-arrive-article', 'pt-arrive-back', 'pt-play');
    document.querySelectorAll('.pt-veil').forEach((v) => v.remove());
    flying?.remove();
    flying = null;
    titles().forEach((t) => (t.style.visibility = ''));
  };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.articles a[href]');
    if (!link || link.getAttribute('href') === '#' || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
    if (e.altKey) return; // Alt-click selects the title in the controls instead
    try {
      sessionStorage.setItem('home-url', location.href);
    } catch {}
    const title = link.querySelector('.title');
    if (reduce || !title) return; // a plain page change

    e.preventDefault();
    // a stand-in for the title, fixed where it is, so it stays put while everything else goes
    const r = title.getBoundingClientRect();
    const cs = getComputedStyle(title);
    flying = document.createElement('div');
    flying.className = 'pt-flying';
    flying.textContent = title.textContent;
    Object.assign(flying.style, {
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${title.offsetWidth + 1}px`,
      // copied one by one: the font shorthand comes back empty for this variable font
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      lineHeight: cs.lineHeight,
      fontVariationSettings: cs.fontVariationSettings,
      letterSpacing: cs.letterSpacing,
    });
    const scale = r.width / title.offsetWidth || 1; // the list may be scaled by the scroll effect
    if (Math.abs(scale - 1) > 0.01) {
      flying.style.transformOrigin = '0 0';
      flying.style.scale = scale;
    }
    flying.style.setProperty('--pen-left', title.style.getPropertyValue('--pen-left'));
    flying.style.setProperty('--pen-width', title.style.getPropertyValue('--pen-width'));
    // the cream veil, growing from the title's centre to past the furthest corner
    const veil = document.createElement('div');
    veil.className = 'pt-veil';
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 20;
    veil.style.clipPath = `circle(0px at ${cx}px ${cy}px)`;
    veil.style.setProperty('--pt-veil-full', `circle(${radius}px at ${cx}px ${cy}px)`);
    document.body.append(veil, flying);
    title.style.visibility = 'hidden';
    root.classList.add('pt-leave-home');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        veil.classList.add('is-open');
        flying?.classList.add('is-lifted');
      }),
    );

    // where the title is on screen once it has lifted (the article picks it up from there),
    // and where you were in the list (to take you back there)
    const scroll = Math.round(scrollY);
    try {
      sessionStorage.setItem('home-scroll', String(scroll));
    } catch {}
    const data = { type: 'open', title: { left: Math.round(r.left), top: Math.round(r.top - 3) }, scroll };
    handOver(data);
    setTimeout(() => (location.href = withHandOver(link.href, data)), 300);
  });

  // ---------------------------------------------------------------- leaving an article
  document.addEventListener('click', (e) => {
    const back = e.target.closest('.article .back');
    if (!back || e.metaKey || e.ctrlKey || e.shiftKey) return;
    // back to the exact home page you came from (in the preview, "../" isn't reliable)
    const target = homeUrl() || back.href;
    e.preventDefault();
    if (reduce) return void (location.href = target);
    root.classList.add('pt-leave-article');
    const data = { type: 'back', scroll: homeScroll() };
    handOver(data);
    setTimeout(() => (location.href = withHandOver(target, data)), 160);
  });

  // The browser's back button may restore the home page from its cache, still mid-exit: tidy
  // it up and bring it in from the left. (Restoring an article just tidies up.)
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    cleanup();
    if (reduce || isArticle()) return;
    root.classList.add('pt-arrive-back', 'pt-skip-intro');
    play('pt-arrive-back', 700);
  });

  // ---------------------------------------------------------------- preloading
  // An article fetches the home page you came from once it's idle, so going back is instant.
  addEventListener('load', () => {
    const home = homeUrl();
    if (!isArticle() || !home) return;
    (window.requestIdleCallback || setTimeout)(() => {
      const hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.href = home;
      document.head.append(hint);
    });
  });

  // Fetch an article as soon as its title is hovered or focused, so the click finds it ready.
  const preloaded = new Set();
  const preload = (e) => {
    const link = e.target.closest?.('.articles a[href]');
    if (!link || link.getAttribute('href') === '#' || preloaded.has(link.href)) return;
    preloaded.add(link.href);
    const hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = link.href;
    document.head.append(hint);
  };
  document.addEventListener('pointerover', preload, { passive: true });
  document.addEventListener('focusin', preload);
  document.addEventListener('touchstart', preload, { passive: true });
})();
