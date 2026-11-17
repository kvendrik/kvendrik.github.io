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
  const SIDES = ['Top', 'Left', 'Right', 'Bottom'];
  const dial = DialKit.createDialKit('Selection', {
    Padding: [0, 0, 120, 1],
    Top: [0, 0, 120, 1],
    Left: [0, 0, 120, 1],
    Right: [0, 0, 120, 1],
    Bottom: [0, 0, 120, 1],
    'Font size': [20, 10, 96, 1],
    'Font weight': [300, 100, 900, 10],
  });

  // Show the selected layer's current values in the panel.
  let syncing = false;
  let last = dial.getValues();
  const read = (el) => {
    const cs = getComputedStyle(el);
    const px = (v) => Math.round(parseFloat(v) || 0);
    const values = {
      Padding: px(cs.paddingTop),
      Top: px(cs.paddingTop),
      Left: px(cs.paddingLeft),
      Right: px(cs.paddingRight),
      Bottom: px(cs.paddingBottom),
      'Font size': px(cs.fontSize),
      'Font weight': px(cs.fontWeight),
    };
    syncing = true;
    dial.setValues(values);
    syncing = false;
    last = values;
  };

  // The Padding slider sets all four sides; a side slider sets just that side.
  dial.subscribe((values) => {
    if (syncing || !selected) return (last = values);
    const st = selected.style;
    if (values.Padding !== last.Padding) {
      st.padding = `${values.Padding}px`;
      syncing = true;
      dial.setValues(Object.fromEntries(SIDES.map((k) => [k, values.Padding])));
      syncing = false;
      values = dial.getValues();
    } else {
      for (const k of SIDES) if (values[k] !== last[k]) st[`padding${k}`] = `${values[k]}px`;
    }
    if (values['Font size'] !== last['Font size']) st.fontSize = `${values['Font size']}px`;
    if (values['Font weight'] !== last['Font weight']) st.fontWeight = values['Font weight'];
    last = values;
  });

  // The icon next to Padding folds the four side sliders open and closed.
  const toggle = document.createElement('button');
  toggle.className = 'sides-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Padding per side');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25">' +
    '<rect x="1.75" y="1.75" width="12.5" height="12.5" rx="3.25" stroke-opacity="0.5" pathLength="48" stroke-dasharray="1.5 1.5" stroke-dashoffset="0.75" stroke-linecap="round"/>' +
    '<rect x="5.5" y="5.5" width="5" height="5" rx="1.25"/></svg>';
  toggle.addEventListener('click', () => {
    const open = document.documentElement.classList.toggle('sides-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  const mount = () => {
    const inner = document.querySelector('.dialkit-folder-inner');
    if (!inner) return requestAnimationFrame(mount);
    const rows = inner.querySelectorAll(':scope > .dialkit-slider-wrapper');
    rows.forEach((row, i) => i >= 1 && i <= 4 && row.classList.add('side'));
    rows[0].classList.add('pad-row');
    rows[0].after(toggle);
    // keep the icon beside the Padding row, outside the slider so it isn't dragged
    toggle.style.top = `${rows[0].offsetTop}px`;
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
