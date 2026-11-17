// A pan-and-zoom canvas for diagrams, styled after the Flowchart on beautifului.dev (MIT):
// a dotted surface, cards with a small coloured tag, and soft curves between them.
// Drag to pan (it keeps a little momentum), pinch or Ctrl/⌘-scroll to zoom around the pointer,
// or use the − / + buttons. The diagram lives in .canvas-world in its own coordinates;
// edges are drawn between [data-node] cards from <path data-from data-to> hints.
(() => {
  const MIN = 0.35, MAX = 2.5;

  const setup = (stage) => {
    const world = stage.querySelector('.canvas-world');
    const svg = stage.querySelector('.canvas-edges');
    const label = stage.querySelector('.canvas-zoom-value');
    let x = 0, y = 0, k = 1;
    let vx = 0, vy = 0, glide = 0;

    // the diagram's own bounds, from its cards
    let bounds = { x: 0, y: 0, w: 1, h: 1 };
    const measure = () => {
      const ns = [...world.querySelectorAll('[data-node]')];
      const l = Math.min(...ns.map((n) => n.offsetLeft)), t = Math.min(...ns.map((n) => n.offsetTop));
      const r = Math.max(...ns.map((n) => n.offsetLeft + n.offsetWidth));
      const b = Math.max(...ns.map((n) => n.offsetTop + n.offsetHeight));
      const m = 70; // room around the cards for connectors that go around
      bounds = { x: l - m, y: t - 10, w: r - l + m * 2, h: b - t + m + 10 };
    };

    // keep at least a corner of the diagram on screen, so it can never be lost
    const KEEP = 120;
    const clamp = () => {
      const r = stage.getBoundingClientRect();
      const left = x + bounds.x * k, top = y + bounds.y * k;
      const right = left + bounds.w * k, bottom = top + bounds.h * k;
      let hit = false;
      if (right < KEEP) { x += KEEP - right; hit = true; }
      if (left > r.width - KEEP) { x -= left - (r.width - KEEP); hit = true; }
      if (bottom < KEEP) { y += KEEP - bottom; hit = true; }
      if (top > r.height - KEEP) { y -= top - (r.height - KEEP); hit = true; }
      return hit;
    };

    const apply = () => {
      clamp();
      world.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
      // the dots move and scale with the world, so it feels like one surface
      stage.style.backgroundSize = `${22 * k}px ${22 * k}px`;
      stage.style.backgroundPosition = `${x}px ${y}px`;
      if (label) label.textContent = `${Math.round(k * 100)}%`;
    };

    const zoomAt = (px, py, next) => {
      next = Math.min(MAX, Math.max(MIN, next));
      x = px - (px - x) * (next / k);
      y = py - (py - y) * (next / k);
      k = next;
      apply();
    };

    // start (and Fit) with the whole width of the diagram, from its top: then pan down it
    const fit = () => {
      const pad = 28;
      const r = stage.getBoundingClientRect();
      k = Math.min(1, (r.width - pad * 2) / bounds.w, Math.max(0.6, (r.height - pad * 2) / bounds.h));
      x = (r.width - bounds.w * k) / 2 - bounds.x * k;
      y = pad - bounds.y * k;
      apply();
    };

    // edges: a cubic curve from the bottom of one card to the top of the next,
    // or around the side for paths marked data-side
    // Connectors, the way whiteboard tools draw them: straight runs at right angles with rounded
    // bends. Each <path> names its ends: data-from / data-to, the side it leaves and enters by
    // (data-out / data-in: top, right, bottom, left), and optionally data-via="x" or "y" for a
    // detour around the diagram (a negative x goes around the left, see the loop).
    const R = 16;
    const anchor = (id, side) => {
      const n = world.querySelector(`[data-node="${id}"]`);
      const x = n.offsetLeft, y = n.offsetTop, w = n.offsetWidth, h = n.offsetHeight;
      return {
        top: [x + w / 2, y], bottom: [x + w / 2, y + h], left: [x, y + h / 2], right: [x + w, y + h / 2],
      }[side];
    };
    const GAP = 7; // the arrowhead stops just short of the shape
    const nudge = ([x, y], side) => ({ top: [x, y - GAP], bottom: [x, y + GAP], left: [x - GAP, y], right: [x + GAP, y] })[side];
    const rounded = (pts) => {
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1];
        const r = Math.min(R, Math.hypot(cx - px, cy - py) / 2, Math.hypot(nx - cx, ny - cy) / 2);
        const ax = cx - Math.sign(cx - px) * r, ay = cy - Math.sign(cy - py) * r;
        const bx = cx + Math.sign(nx - cx) * r, by = cy + Math.sign(ny - cy) * r;
        d += ` L${ax} ${ay} Q${cx} ${cy} ${bx} ${by}`;
      }
      const [lx, ly] = pts[pts.length - 1];
      return d + ` L${lx} ${ly}`;
    };
    const drawEdges = () => {
      svg.setAttribute('width', world.scrollWidth);
      svg.setAttribute('height', world.scrollHeight);
      svg.querySelectorAll('path[data-from]').forEach((p) => {
        const out = p.dataset.out || 'bottom', inn = p.dataset.in || 'top';
        const a = anchor(p.dataset.from, out), b = nudge(anchor(p.dataset.to, inn), inn);
        const vertical = (side) => side === 'top' || side === 'bottom';
        let pts;
        if (p.dataset.via) {
          // leave, run out to the detour line, along it, and come back in
          const v = +p.dataset.via;
          const lineX = v < 0 ? bounds.x + 24 : bounds.x + bounds.w - 24;
          const drop = a[1] + 36;
          pts = [a, [a[0], drop], [lineX, drop], [lineX, b[1]], b];
        } else if (vertical(out) && vertical(inn)) {
          const mid = (a[1] + b[1]) / 2;
          pts = Math.abs(a[0] - b[0]) < 1 ? [a, b] : [a, [a[0], mid], [b[0], mid], b];
        } else if (vertical(out)) {
          pts = [a, [a[0], b[1]], b]; // down, then across into a side
        } else if (vertical(inn)) {
          pts = [a, [b[0], a[1]], b]; // across, then down into a top
        } else {
          const mid = (a[0] + b[0]) / 2;
          pts = [a, [mid, a[1]], [mid, b[1]], b];
        }
        p.setAttribute('d', rounded(pts));
      });
      // labels sit on their connector in a small pill
      world.querySelectorAll('.canvas-label[data-label-for]').forEach((t) => {
        const p = svg.querySelector(`#${t.dataset.labelFor}`);
        const at = p.getPointAtLength(p.getTotalLength() * (+t.dataset.at || 0.5));
        t.style.left = `${at.x}px`;
        t.style.top = `${at.y}px`;
      });
    };

    // pointers: one pans, two pinch
    const pts = new Map();
    let last = null, lastT = 0, pinch = null;
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cancelAnimationFrame(glide);
      vx = vy = 0;
      last = { x: e.clientX, y: e.clientY };
      lastT = performance.now();
      stage.classList.add('is-grabbing');
      if (pts.size === 2) {
        const [p1, p2] = [...pts.values()];
        pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), k };
      }
    });
    stage.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = stage.getBoundingClientRect();
      if (pts.size === 2 && pinch) {
        const [p1, p2] = [...pts.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        zoomAt((p1.x + p2.x) / 2 - r.left, (p1.y + p2.y) / 2 - r.top, pinch.k * (d / pinch.d));
        return;
      }
      const now = performance.now();
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      const dt = Math.max(1, now - lastT);
      vx = 0.8 * (dx / dt) + 0.2 * vx; // px per ms, smoothed
      vy = 0.8 * (dy / dt) + 0.2 * vy;
      last = { x: e.clientX, y: e.clientY };
      lastT = now;
      x += dx;
      y += dy;
      apply();
    });
    const release = (e) => {
      if (!pts.delete(e.pointerId)) return;
      if (pts.size < 2) pinch = null;
      if (pts.size) return;
      stage.classList.remove('is-grabbing');
      if (performance.now() - lastT > 60) return; // they stopped before letting go
      // momentum: carry the release velocity and let it decay, like a scroll view
      const cap = 2.5, sp = Math.hypot(vx, vy);
      if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
      let prev = performance.now();
      const step = (now) => {
        const dt = now - prev;
        prev = now;
        const decay = Math.pow(0.994, dt);
        vx *= decay;
        vy *= decay;
        x += vx * dt;
        y += vy * dt;
        if (clamp()) vx = vy = 0;
        apply();
        if (Math.hypot(vx, vy) > 0.02) glide = requestAnimationFrame(step);
      };
      glide = requestAnimationFrame(step);
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);

    // Ctrl/⌘-scroll and trackpad pinch zoom; plain scrolling still scrolls the page
    stage.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, k * Math.exp(-e.deltaY * 0.01));
    }, { passive: false });

    const center = () => {
      const r = stage.getBoundingClientRect();
      return [r.width / 2, r.height / 2];
    };
    stage.querySelector('[data-zoom="in"]')?.addEventListener('click', () => zoomAt(...center(), k * 1.25));
    stage.querySelector('[data-zoom="out"]')?.addEventListener('click', () => zoomAt(...center(), k / 1.25));
    stage.querySelector('[data-zoom="fit"]')?.addEventListener('click', fit);

    const init = () => {
      measure();
      drawEdges();
      fit();
    };
    document.fonts?.ready.then(init);
    init();
    let width = 0;
    new ResizeObserver(([e]) => {
      if (Math.abs(e.contentRect.width - width) < 1) return;
      width = e.contentRect.width;
      fit();
    }).observe(stage);
  };

  document.querySelectorAll('.canvas-stage').forEach(setup);
})();
