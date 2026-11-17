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
      const r = Math.max(...ns.map((n) => n.offsetLeft + n.offsetWidth)) + 140; // room for the loop
      const b = Math.max(...ns.map((n) => n.offsetTop + n.offsetHeight));
      bounds = { x: l, y: t, w: r - l, h: b - t };
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
      k = Math.min(1, Math.max(0.6, (r.width - pad * 2) / bounds.w));
      x = (r.width - bounds.w * k) / 2 - bounds.x * k;
      y = pad - bounds.y * k;
      apply();
    };

    // edges: a cubic curve from the bottom of one card to the top of the next,
    // or around the side for paths marked data-side
    const drawEdges = () => {
      const box = (id) => {
        const n = world.querySelector(`[data-node="${id}"]`);
        return { x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight };
      };
      svg.setAttribute('width', world.scrollWidth);
      svg.setAttribute('height', world.scrollHeight);
      svg.querySelectorAll('path[data-from]').forEach((p) => {
        const a = box(p.dataset.from), b = box(p.dataset.to);
        let d;
        if (p.dataset.side) {
          const side = p.dataset.side === 'right' ? 1 : -1;
          const ax = side > 0 ? a.x + a.w : a.x, ay = a.y + a.h / 2;
          const bx = side > 0 ? b.x + b.w : b.x, by = b.y + b.h / 2;
          const out = side > 0 ? bounds.x + bounds.w - 100 : bounds.x - 40;
          const r = 18 * side, up = by < ay ? -1 : 1;
          // out to the side, along it with rounded corners, and back in
          d = `M${ax} ${ay} H${out - r} Q${out} ${ay} ${out} ${ay + 18 * up} V${by - 18 * up} Q${out} ${by} ${out - r} ${by} H${bx + side * 6}`;
        } else {
          const ax = a.x + a.w / 2, ay = a.y + a.h;
          const bx = b.x + b.w / 2, by = b.y - 6;
          const m = (by - ay) / 2;
          d = `M${ax} ${ay} C${ax} ${ay + m}, ${bx} ${by - m}, ${bx} ${by}`;
        }
        p.setAttribute('d', d);
      });
      svg.querySelectorAll('[data-label-for]').forEach((t) => {
        const p = svg.querySelector(`#${t.dataset.labelFor}`);
        const at = p.getPointAtLength(p.getTotalLength() * (+t.dataset.at || 0.5));
        t.setAttribute('x', at.x);
        t.setAttribute('y', at.y);
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
