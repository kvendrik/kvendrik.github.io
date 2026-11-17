// Live editing for article pages. "Edit" turns the page itself into the editor: the title, the
// date line and the body become editable in place, selecting text shows a small toolbar (bold,
// italic, heading, quote, link), and everything autosaves as a draft in this browser.
// Where articles get published is still to be decided; for now drafts only live locally.
(() => {
  const slug = location.pathname.split('/').pop().replace(/\.html$/, '') || 'article';
  const KEY = `draft:${slug}`;
  const root = document.documentElement;
  const title = document.querySelector('.article h1');
  const meta = document.querySelector('.article .meta');
  const body = document.querySelector('.article .body');
  if (!title || !body) return;

  const fields = [
    [title, 'Title'],
    [meta, 'Date · Place'],
    [body, 'Start writing…'],
  ].filter(([el]) => el);
  for (const [el, placeholder] of fields) {
    el.dataset.editable = '';
    el.dataset.placeholder = placeholder;
  }

  // ---- drafts: only a small set of tags survives, so a stored draft can't inject anything else
  const ALLOWED = new Set(['P', 'H2', 'BLOCKQUOTE', 'STRONG', 'B', 'EM', 'I', 'A', 'BR']);
  const clean = (html) => {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) continue;
        if (child.nodeType !== Node.ELEMENT_NODE || !ALLOWED.has(child.tagName)) {
          child.replaceWith(...(child.nodeType === Node.ELEMENT_NODE ? child.childNodes : []));
          continue;
        }
        for (const attr of [...child.attributes]) {
          const keep = child.tagName === 'A' && attr.name === 'href' && /^(https?:|mailto:|\/|#)/i.test(attr.value);
          if (!keep) child.removeAttribute(attr.name);
        }
        walk(child);
      }
    };
    const wrap = doc.body.firstChild;
    walk(wrap);
    return wrap.innerHTML;
  };

  // Floating toolbar at the bottom while writing: save state, word count, Focus, Discard, Done
  const ICON_FOCUS =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 5.5V3.5A1.5 1.5 0 0 1 3.5 2h2M10.5 2h2A1.5 1.5 0 0 1 14 3.5v2M14 10.5v2a1.5 1.5 0 0 1-1.5 1.5h-2M5.5 14h-2A1.5 1.5 0 0 1 2 12.5v-2"/><path d="M5 8h6"/></svg>';
  const ICON_DISCARD =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5h6a3.5 3.5 0 0 1 0 7H7"/><path d="M6 3.5 3 6.5l3 3"/></svg>';
  const status = document.createElement('div');
  status.className = 'write-status';
  status.setAttribute('role', 'toolbar');
  status.setAttribute('aria-label', 'Writing');
  status.innerHTML =
    '<span class="write-save" aria-live="polite"><i></i><span></span></span>' +
    '<span class="write-sep"></span>' +
    '<span class="write-count"></span>' +
    '<span class="write-sep"></span>' +
    `<button type="button" class="write-icon write-focus" aria-pressed="true" aria-label="Focus mode" title="Focus mode: dim all but the paragraph you\u2019re in">${ICON_FOCUS}</button>` +
    `<button type="button" class="write-icon write-discard" aria-label="Discard draft" title="Discard draft: go back to the published text">${ICON_DISCARD}</button>` +
    '<button type="button" class="write-done">Done</button>' +
    '<button type="button" class="write-send" hidden title="Send this version to Claude to publish">Send to Claude</button>';
  document.body.append(status);
  const countEl = status.querySelector('.write-count');
  const saveEl = status.querySelector('.write-save');
  const words = () => (body.innerText.trim().match(/\S+/g) || []).length;
  // state: 'saved' | 'saving' | 'restored' | 'error'
  const LABELS = {
    saved: 'Saved',
    saving: 'Saving',
    restored: 'Draft restored',
    error: 'Not saved',
    sending: 'Sending to Claude',
    sent: 'Sent to Claude',
    stored: 'Stored for Claude',
    'send-failed': 'Not sent',
  };
  const setStatus = (state) => {
    const n = words();
    const mins = Math.max(1, Math.round(n / 230));
    countEl.innerHTML = n
      ? `${n.toLocaleString()} <span>${n === 1 ? 'word' : 'words'}</span> · ${mins} <span>min</span>`
      : '<span>No words yet</span>';
    saveEl.dataset.state = state;
    saveEl.querySelector('span').textContent = LABELS[state];
    saveEl.title = state === 'error' ? 'This browser won\u2019t let the draft be saved' : 'Drafts are saved in this browser';
  };

  const load = () => {
    try {
      const draft = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!draft) return false;
      title.textContent = draft.title ?? title.textContent;
      if (meta && draft.meta != null) meta.textContent = draft.meta;
      if (draft.body != null) body.innerHTML = clean(draft.body);
      return true;
    } catch {
      return false;
    }
  };

  let saveTimer = 0;
  const save = () => {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ title: title.textContent, meta: meta?.textContent, body: clean(body.innerHTML), savedAt: Date.now() }),
      );
      hasDraft = true;
      root.classList.add('has-draft');
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };
  const queueSave = () => {
    setStatus('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 600);
  };

  // show the "Start writing…" placeholder while the body has no words
  const markEmpty = () => body.classList.toggle('is-empty', !body.textContent.trim());
  body.addEventListener('input', () => markEmpty());

  const restored = load();
  let hasDraft = restored;
  // newly written blocks become selectable layers for the controls, like the original ones
  const tagLayers = () => body.querySelectorAll(':scope > *').forEach((el) => el.classList.add('layer'));
  tagLayers();
  root.classList.toggle('has-draft', hasDraft);

  // Discard: forget the draft and go back to the published text
  status.querySelector('.write-discard').addEventListener('click', () => {
    if (!confirm('Discard your draft and go back to the published text?')) return;
    clearTimeout(saveTimer);
    try {
      localStorage.removeItem(KEY);
    } catch {}
    location.reload();
  });

  // ---- Focus mode (iA Writer): only the paragraph you're in stays bright, and the line you're
  // writing stays near the middle of the screen. On by default, remembered in this browser.
  let focus = true;
  try {
    focus = localStorage.getItem('editor-focus') !== '0';
  } catch {}
  const focusBtn = status.querySelector('.write-focus');
  const setFocus = (on) => {
    focus = on;
    root.classList.toggle('focus-mode', on);
    focusBtn.setAttribute('aria-pressed', String(on));
    try {
      localStorage.setItem('editor-focus', on ? '1' : '0');
    } catch {}
  };
  focusBtn.addEventListener('click', () => setFocus(!focus));
  setFocus(focus);

  let current = null;
  const markCurrent = () => {
    const sel = getSelection();
    const node = sel.anchorNode;
    const inBody = !!node && body.contains(node);
    const block = inBody ? blockOf(node) : null;
    if (block !== current) {
      current?.removeAttribute('data-current');
      block?.setAttribute('data-current', '');
      current = block;
    }
    root.classList.toggle('focus-body', inBody);
  };

  // typewriter scrolling: only nudge when the caret leaves the middle band of the screen
  const keepCaretCentred = () => {
    if (!focus) return;
    const sel = getSelection();
    if (!sel.rangeCount || !body.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0);
    const rect = range.getClientRects()[0] || blockOf(sel.anchorNode)?.getBoundingClientRect();
    if (!rect) return;
    if (rect.top > innerHeight * 0.62 || rect.top < innerHeight * 0.22) {
      scrollBy({ top: rect.top - innerHeight * 0.42, behavior: 'smooth' });
    }
  };

  // the page chrome steps back while you type, and comes back when you move the mouse
  let lastPointer = null;
  addEventListener('pointermove', (e) => {
    if (lastPointer && Math.hypot(e.clientX - lastPointer[0], e.clientY - lastPointer[1]) < 4) return;
    lastPointer = [e.clientX, e.clientY];
    root.classList.remove('is-typing');
  });

  // ---- Edit / Done
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'edit-toggle';
  toggle.textContent = 'Edit';
  document.body.append(toggle);

  const supportsPlain = (() => {
    const d = document.createElement('div');
    d.contentEditable = 'plaintext-only';
    return d.contentEditable === 'plaintext-only';
  })();

  let writing = false;
  const setWriting = (on) => {
    writing = on;
    root.classList.toggle('writing-mode', on);
    toggle.textContent = on ? 'Done' : 'Edit';
    title.contentEditable = on ? (supportsPlain ? 'plaintext-only' : 'true') : 'false';
    if (meta) meta.contentEditable = title.contentEditable;
    body.contentEditable = on ? 'true' : 'false';
    if (on) {
      document.execCommand('defaultParagraphSeparator', false, 'p');
      // an empty body starts with one empty paragraph, so the first words land in a <p>
      if (!body.querySelector('p, h2, blockquote')) body.innerHTML = '<p><br></p>';
      markEmpty();
      // drop any Figma-style selection so the two modes don't overlap
      dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      setStatus(restored ? 'restored' : 'saved');
      refreshSend?.();
      if (!title.textContent.trim()) title.focus();
    } else {
      closeBar();
      current?.removeAttribute('data-current');
      current = null;
      root.classList.remove('focus-body', 'is-typing');
      body.innerHTML = clean(body.innerHTML);
      tagLayers();
      save();
      getSelection().removeAllRanges();
    }
  };
  toggle.addEventListener('click', () => setWriting(!writing));
  status.querySelector('.write-done').addEventListener('click', () => setWriting(false));

  // ---- Send to Claude: inside the claude.ai preview, the edited article is stored in the
  // page's private database (editors only) and a short note is sent to the Claude session
  // watching it, which applies the edit to the site and deploys it. Elsewhere the button stays
  // hidden.
  const sendBtn = status.querySelector('.write-send');
  let db = null;
  let comments = null;
  const refreshSend = async () => {
    if (!db) return (sendBtn.hidden = true);
    let can = 'off';
    try {
      can = comments ? await comments.canSendToClaude() : 'off';
    } catch {}
    sendBtn.hidden = false;
    sendBtn.dataset.mode = can === 'available' ? 'send' : 'store';
    sendBtn.textContent = can === 'available' ? 'Send to Claude' : 'Save for Claude';
    sendBtn.title =
      can === 'available'
        ? 'Send this version to Claude to publish'
        : 'No Claude session is listening right now: store this version, then tell Claude in chat';
  };
  if (window.claude?.use) {
    Promise.all([claude.use('db').catch(() => null), claude.use('comments').catch(() => null)]).then(([d, c]) => {
      db = d;
      comments = c;
      refreshSend();
    });
  }
  sendBtn.addEventListener('click', async () => {
    if (!db || sendBtn.disabled) return;
    save();
    sendBtn.disabled = true;
    setStatus('sending');
    const n = words();
    const name = title.textContent.trim() || 'Untitled';
    try {
      const ref = await db.collection('edits').add({
        slug,
        title: name,
        meta: meta?.textContent.trim() ?? '',
        body: clean(body.innerHTML),
        words: n,
        sentAt: Date.now(),
      });
      if (sendBtn.dataset.mode === 'send') {
        try {
          await comments.sendToClaude({
            anchor: await comments.anchorFor(title),
            text: `Please publish my edit to "${name}" (${n} words). It's stored as edits/${ref.id} in this page's database.`,
          });
          setStatus('sent');
        } catch (err) {
          // the edit is stored either way; only the note didn't go out
          setStatus('stored');
          saveEl.title = `Stored as edits/${ref.id}. Tell Claude in chat to publish it.`;
          refreshSend();
        }
      } else {
        setStatus('stored');
        saveEl.title = `Stored as edits/${ref.id}. Tell Claude in chat to publish it.`;
      }
    } catch {
      setStatus('send-failed');
    } finally {
      sendBtn.disabled = false;
    }
  });

  // ---- typing behaviour
  for (const el of [title, meta].filter(Boolean)) {
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault(); // one line only: Enter moves on to the next field
      (el === title && meta ? meta : body).focus();
    });
  }
  for (const [el] of fields) el.addEventListener('input', queueSave);

  for (const [el] of fields) {
    el.addEventListener('keydown', (e) => {
      if (!writing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault(); // save the draft, not the web page
        save();
        return;
      }
      if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace') root.classList.add('is-typing');
    });
  }

  // new lines are always plain paragraphs: no stray <div>s or inline styles from the browser
  const tidy = () => {
    for (const el of body.querySelectorAll('[style], font, span:not([class])')) {
      if (el.tagName === 'FONT' || el.tagName === 'SPAN') el.replaceWith(...el.childNodes);
      else el.removeAttribute('style');
    }
    for (const div of body.querySelectorAll(':scope > div')) {
      const p = document.createElement('p');
      p.append(...div.childNodes);
      div.replaceWith(p);
      const r = document.createRange();
      r.setStart(p, p.childNodes.length ? 0 : 0);
      r.collapse(true);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }
  };

  // Markdown-style shortcuts at the start of a paragraph: "## " heading, "# " heading, "> " quote
  body.addEventListener('input', (e) => {
    tidy();
    const sel = getSelection();
    let block = blockOf(sel.anchorNode);
    // a new line after a heading is a normal paragraph again
    if (e.inputType === 'insertParagraph' && block?.tagName === 'H2' && block.previousElementSibling?.tagName === 'H2') {
      document.execCommand('formatBlock', false, 'p');
      block = blockOf(getSelection().anchorNode);
    }
    if (block && e.inputType === 'insertText' && e.data === ' ') {
      const text = block.textContent;
      const match = text.match(/^(#{1,3}|>) /);
      if (match && block.tagName === 'P') {
        // drop the typed marker, then change the block
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        let first = walker.nextNode();
        let left = match[0].length;
        while (first && left > 0) {
          const take = Math.min(left, first.data.length);
          first.deleteData(0, take);
          left -= take;
          first = walker.nextNode();
        }
        document.execCommand('formatBlock', false, match[1] === '>' ? 'blockquote' : 'h2');
      }
    }
    markCurrent();
    keepCaretCentred();
  });

  // Enter on an empty line in a quote or heading steps back out into a normal paragraph
  body.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || !writing) return;
    const block = blockOf(getSelection().anchorNode);
    if (block && block.tagName !== 'P' && !block.textContent.trim()) {
      e.preventDefault();
      document.execCommand('formatBlock', false, 'p');
    }
  });

  // pasting keeps the words, not the formatting of wherever they came from
  for (const [el] of fields) {
    el.addEventListener('paste', (e) => {
      if (!writing) return;
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      if (el !== body) return document.execCommand('insertText', false, text.replace(/\s*\n+\s*/g, ' '));
      const paras = text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
      if (paras.length <= 1) return document.execCommand('insertText', false, text);
      const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
      document.execCommand('insertHTML', false, paras.map((p) => `<p>${esc(p)}</p>`).join(''));
    });
  }

  // ---- selection toolbar
  const ICONS = {
    bold: '<b>B</b>',
    italic: '<em>i</em>',
    heading: '<span style="font-weight:600">H</span>',
    quote:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 9.5C3 7 4.5 5 7 4.5l.4 1.2C6 6.2 5.3 7.2 5.3 8.3H7v4H3V9.5Zm6 0C9 7 10.5 5 13 4.5l.4 1.2c-1.4.5-2.1 1.5-2.1 2.6H13v4H9V9.5Z"/></svg>',
    link:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1"/></svg>',
  };
  const bar = document.createElement('div');
  bar.className = 'format-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Text formatting');
  bar.innerHTML = `
    <button type="button" data-cmd="bold" aria-label="Bold" title="Bold  ⌘B">${ICONS.bold}</button>
    <button type="button" data-cmd="italic" aria-label="Italic" title="Italic  ⌘I">${ICONS.italic}</button>
    <span class="divider"></span>
    <button type="button" data-cmd="heading" aria-label="Heading" title="Heading  (type ## )">${ICONS.heading}</button>
    <button type="button" data-cmd="quote" aria-label="Quote" title="Quote  (type > )">${ICONS.quote}</button>
    <span class="divider"></span>
    <button type="button" data-cmd="link" aria-label="Link" title="Link  ⌘K">${ICONS.link}</button>
    <input type="url" placeholder="Paste a link, then Enter" aria-label="Link address" />`;
  document.body.append(bar);
  const linkInput = bar.querySelector('input');

  const blockOf = (node) => {
    let el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el && el.parentElement !== body) el = el.parentElement;
    return el;
  };
  const linkOf = (node) => (node?.nodeType === Node.TEXT_NODE ? node.parentElement : node)?.closest?.('a');

  let savedRange = null;
  const closeBar = () => {
    bar.classList.remove('is-open');
    bar.dataset.view = '';
  };
  const placeBar = (rect) => {
    const w = bar.offsetWidth;
    const h = bar.offsetHeight;
    const left = Math.min(innerWidth - w - 8, Math.max(8, rect.left + rect.width / 2 - w / 2));
    const above = rect.top - h - 10;
    bar.style.left = `${left}px`;
    bar.style.top = `${above > 8 ? above : rect.bottom + 10}px`;
    // grow out of the side that faces the selected text
    bar.style.transformOrigin = `${rect.left + rect.width / 2 - left}px ${above > 8 ? '100%' : '0%'}`;
  };
  const refreshActive = () => {
    const sel = getSelection();
    const block = blockOf(sel.anchorNode);
    const states = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      heading: block?.tagName === 'H2',
      quote: block?.tagName === 'BLOCKQUOTE',
      link: !!linkOf(sel.anchorNode),
    };
    bar.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', !!states[b.dataset.cmd]));
  };

  document.addEventListener('selectionchange', () => {
    if (writing) markCurrent();
    if (!writing || bar.dataset.view === 'link') return;
    const sel = getSelection();
    if (!sel.rangeCount || sel.isCollapsed || !body.contains(sel.anchorNode) || !body.contains(sel.focusNode)) {
      return closeBar();
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) return closeBar();
    refreshActive();
    bar.classList.add('is-open');
    placeBar(rect);
  });
  addEventListener('scroll', () => bar.classList.contains('is-open') && closeBar(), { passive: true });

  // keep the text selection while clicking the toolbar
  bar.addEventListener('mousedown', (e) => e.target !== linkInput && e.preventDefault());

  const run = (cmd) => {
    const sel = getSelection();
    const block = blockOf(sel.anchorNode);
    if (cmd === 'bold' || cmd === 'italic') document.execCommand(cmd);
    if (cmd === 'heading') document.execCommand('formatBlock', false, block?.tagName === 'H2' ? 'p' : 'h2');
    if (cmd === 'quote') document.execCommand('formatBlock', false, block?.tagName === 'BLOCKQUOTE' ? 'p' : 'blockquote');
    if (cmd === 'link') {
      if (linkOf(sel.anchorNode)) {
        document.execCommand('unlink');
      } else {
        savedRange = sel.getRangeAt(0).cloneRange();
        bar.dataset.view = 'link';
        linkInput.value = '';
        linkInput.focus();
        return;
      }
    }
    refreshActive();
    queueSave();
  };
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) run(b.dataset.cmd);
  });

  const finishLink = (apply) => {
    const url = linkInput.value.trim();
    bar.dataset.view = '';
    const sel = getSelection();
    sel.removeAllRanges();
    if (savedRange) sel.addRange(savedRange);
    body.focus({ preventScroll: true });
    if (apply && url) {
      const href = /^(https?:|mailto:|\/|#)/i.test(url) ? url : `https://${url}`;
      document.execCommand('createLink', false, href);
      queueSave();
    }
    savedRange = null;
    refreshActive();
  };
  linkInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishLink(true);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      finishLink(false);
    }
  });
  linkInput.addEventListener('blur', () => bar.dataset.view === 'link' && finishLink(false));

  // Cmd/Ctrl+K adds a link to the selection, like most editors
  body.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !getSelection().isCollapsed) {
      e.preventDefault();
      run('link');
    }
  });

  // a brand-new article opens straight into writing mode
  if (document.body.hasAttribute('data-new-article')) setWriting(true);
})();
