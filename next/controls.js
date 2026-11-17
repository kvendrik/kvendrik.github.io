// Figma-style controls, shared by the home page and the article pages. Every element with the
// class "layer" can be clicked to select it (a blue box with handles); the DialKit panel
// (dialkit.dev) in the bottom right then tunes its padding, font size and weight. Double-click
// edits its text. Click anywhere else or press Esc to deselect.
(() => {
  // the blue selection box with its corner handles and size label
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div class="selection" hidden aria-hidden="true"><i></i><i></i><i></i><i></i><span class="selection-size"></span></div>',
  );
  const box = document.querySelector('.selection');
  const size = box.querySelector('.selection-size');
  let selected = null;
  let editing = null;
  let frame = 0;

  const track = () => {
    const r = selected.getBoundingClientRect();
    Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    size.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
    frame = requestAnimationFrame(track);
  };

  const stopEditing = () => {
    if (!editing) return;
    editing.contentEditable = 'false';
    editing = null;
    getSelection().removeAllRanges();
  };

  const select = (el) => {
    if (el === selected) return;
    stopEditing();
    cancelAnimationFrame(frame);
    selected = el;
    box.hidden = !el;
    document.documentElement.classList.toggle('has-selection', !!el);
    if (!el) return;
    read(el);
    track();
  };

  DialKit.createDialRoot({ position: 'bottom-right', theme: 'light' });
  // Padding and Margin each have an "all sides" slider plus four side sliders.
  const SIDES = ['Top', 'Left', 'Right', 'Bottom'];
  const GROUPS = [
    { name: 'Padding', prop: 'padding', max: 300 },
    { name: 'Margin', prop: 'margin', max: 300 },
  ];
  const sideKey = (g, side) => `${g.name} ${side.toLowerCase()}`;
  const config = {};
  for (const g of GROUPS) {
    config[g.name] = [0, 0, g.max, 1];
    for (const side of SIDES) config[sideKey(g, side)] = [0, 0, g.max, 1];
  }
  config['Font size'] = [20, 10, 96, 1];
  config['Font weight'] = [300, 100, 900, 10];
  const dial = DialKit.createDialKit('Selection', config);

  // Show the selected layer's current values in the panel.
  let syncing = false;
  let last = dial.getValues();
  const read = (el) => {
    const cs = getComputedStyle(el);
    const px = (v) => Math.round(parseFloat(v) || 0);
    const values = { 'Font size': px(cs.fontSize), 'Font weight': px(cs.fontWeight) };
    const mixed = {};
    for (const g of GROUPS) {
      const sides = SIDES.map((side) => px(cs[`${g.prop}${side}`]));
      SIDES.forEach((side, i) => (values[sideKey(g, side)] = sides[i]));
      // all four the same: the main slider shows that value; mixed: it shows the largest side
      mixed[g.name] = new Set(sides).size > 1;
      values[g.name] = Math.max(...sides);
    }
    syncing = true;
    dial.setValues(values);
    syncing = false;
    last = values;
    // when the sides differ, open the side sliders so the real values are visible
    for (const g of GROUPS) g.show?.(mixed[g.name]);
  };

  // An "all sides" slider sets all four sides; a side slider sets just that side.
  dial.subscribe((values) => {
    if (syncing || !selected) return (last = values);
    const st = selected.style;
    for (const g of GROUPS) {
      if (values[g.name] !== last[g.name]) {
        st[g.prop] = `${values[g.name]}px`;
        g.show?.(false);
        syncing = true;
        dial.setValues(Object.fromEntries(SIDES.map((side) => [sideKey(g, side), values[g.name]])));
        syncing = false;
        values = dial.getValues();
      } else {
        for (const side of SIDES) {
          const k = sideKey(g, side);
          if (values[k] !== last[k]) st[`${g.prop}${side}`] = `${values[k]}px`;
        }
        g.show?.(new Set(SIDES.map((side) => values[sideKey(g, side)])).size > 1);
      }
    }
    if (values['Font size'] !== last['Font size']) st.fontSize = `${values['Font size']}px`;
    if (values['Font weight'] !== last['Font weight']) st.fontWeight = values['Font weight'];
    last = values;
  });

  // The icon next to Padding or Margin folds its four side sliders open and closed.
  const ICON =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25">' +
    '<rect x="1.75" y="1.75" width="12.5" height="12.5" rx="3.25" stroke-opacity="0.5" pathLength="48" stroke-dasharray="1.5 1.5" stroke-dashoffset="0.75" stroke-linecap="round"/>' +
    '<rect x="5.5" y="5.5" width="5" height="5" rx="1.25"/></svg>';
  const mount = () => {
    const inner = document.querySelector('.dialkit-folder-inner');
    if (!inner) return requestAnimationFrame(mount);
    const rows = [...inner.querySelectorAll(':scope > .dialkit-slider-wrapper')];
    const label = (row) => row.querySelector('.dialkit-slider-label')?.textContent.trim();
    for (const g of GROUPS) {
      const row = rows.find((r) => label(r) === g.name);
      const sides = rows.filter((r) => label(r)?.startsWith(`${g.name} `));
      sides.forEach((r) => r.classList.add('side'));
      row.classList.add('pad-row');
      const toggle = document.createElement('button');
      toggle.className = 'sides-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-label', `${g.name} per side`);
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = ICON;
      const labelEl = row.querySelector('.dialkit-slider-label');
      const setOpen = (open) => {
        toggle.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        sides.forEach((r) => r.classList.toggle('open', open));
      };
      toggle.addEventListener('click', () => setOpen(!toggle.classList.contains('is-open')));
      // on selecting a layer: mark the main slider "mixed" and open the sides when they differ
      g.show = (isMixed) => {
        labelEl.textContent = isMixed ? `${g.name} · mixed` : g.name;
        if (isMixed) setOpen(true);
      };
      row.append(toggle);
    }

    // A "Controls" header that collapses and expands the sliders. Collapsed by default; the
    // choice is remembered for this browser.
    const body = document.createElement('div');
    body.className = 'controls-body';
    const list = document.createElement('div');
    list.className = 'controls-rows';
    list.append(...inner.children);
    body.append(list);
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'controls-head';
    head.innerHTML =
      '<span>Controls</span><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5 7 5l3.5 3.5"/></svg>';
    inner.append(head, body);
    let open = false;
    try {
      open = localStorage.getItem('controls-open') === '1';
    } catch {}
    const setPanel = (next) => {
      open = next;
      inner.classList.toggle('controls-open', open);
      head.setAttribute('aria-expanded', String(open));
      body.inert = !open;
      try {
        localStorage.setItem('controls-open', open ? '1' : '0');
      } catch {}
    };
    head.addEventListener('click', () => setPanel(!open));
    setPanel(open);
  };
  mount();

  document.addEventListener('click', (e) => {
    if (e.target.closest('[class*="dialkit"]')) return;
    if (editing?.contains(e.target)) {
      e.preventDefault(); // while editing, links are just text
      return;
    }
    const link = e.target.closest('a');
    if (link?.getAttribute('href') === '#') e.preventDefault(); // placeholder links just select
    else if (!editing && link) return; // real links still just work
    select(e.target.closest('.layer'));
  });

  // Double-click enters text editing, keeping the word the browser just selected.
  document.addEventListener('dblclick', (e) => {
    const layer = e.target.closest('.layer');
    const link = e.target.closest('a');
    if (!layer || layer === editing || (link && link.getAttribute('href') !== '#')) return;
    select(layer);
    editing = layer;
    layer.contentEditable = 'true';
    layer.spellcheck = false;
    layer.focus({ preventScroll: true });
  });

  // Esc leaves editing first, then clears the selection.
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (editing) stopEditing();
    else select(null);
  });
})();
