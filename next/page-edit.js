// Edit mode for pages that aren't articles (the home page). Edit turns on the Figma-style
// controls (controls.js): click a line to select it and tune it in the panel, double-click to
// change its text. A floating pill counts the changes and sends them to Claude, who applies
// them to the site. Like the article editor, it only appears where sending works: inside the
// claude.ai preview, for its editors. Esc steps out of edit mode.
(() => {
  if (document.querySelector('.article')) return; // articles have their own editor (editor.js)
  const root = document.documentElement;

  const editBar = document.createElement('div');
  editBar.className = 'edit-bar';
  editBar.innerHTML = '<button type="button" class="edit-toggle" hidden>Edit</button>';
  document.body.append(editBar);
  const toggle = editBar.querySelector('.edit-toggle');

  const pill = document.createElement('div');
  pill.className = 'write-status';
  pill.setAttribute('role', 'toolbar');
  pill.setAttribute('aria-label', 'Editing');
  pill.innerHTML =
    '<span class="write-save" data-state="saved" aria-live="polite"><i></i><span></span></span>' +
    '<span class="write-sep"></span>' +
    '<span class="write-count"></span>' +
    '<button type="button" class="write-send">Send to Claude</button>';
  document.body.append(pill);
  const countEl = pill.querySelector('.write-count');
  const saveEl = pill.querySelector('.write-save');
  const sendBtn = pill.querySelector('.write-send');

  const LABELS = { saved: '', sending: 'Sending to Claude', sent: 'Sent to Claude', stored: 'Stored for Claude', 'send-failed': 'Not sent' };
  const setState = (state) => {
    saveEl.dataset.state = state;
    saveEl.querySelector('span').textContent = LABELS[state] ?? '';
  };
  const render = () => {
    const n = window.pageEdits?.count ?? 0;
    countEl.innerHTML = n
      ? `${n} <span>${n === 1 ? 'change' : 'changes'}</span>`
      : '<span>Click anything to change it</span>';
    sendBtn.disabled = !n;
  };
  window.pageEdits?.onChange(() => {
    setState('saved');
    render();
  });

  const setEdit = (on) => {
    root.classList.toggle('edit-mode', on);
    if (on) render();
  };
  toggle.addEventListener('click', () => setEdit(true));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.isTrusted && !e.defaultPrevented && root.classList.contains('edit-mode')) setEdit(false);
  });

  let db = null;
  let comments = null;
  let canSend = 'off';
  const refresh = async () => {
    try {
      canSend = comments ? await comments.canSendToClaude() : 'off';
    } catch {
      canSend = 'off';
    }
    sendBtn.textContent = canSend === 'available' ? 'Send to Claude' : 'Save for Claude';
    sendBtn.title =
      canSend === 'available'
        ? 'Send these changes to Claude to apply'
        : 'No Claude session is listening right now: store the changes, then tell Claude in chat';
  };
  window.claude?.use &&
    Promise.all([claude.use('db').catch(() => null), claude.use('comments').catch(() => null)]).then(([d, c]) => {
      db = d;
      comments = c;
      if (!db) return;
      toggle.hidden = false;
      refresh();
    });

  sendBtn.addEventListener('click', async () => {
    const changes = window.pageEdits?.list() ?? [];
    if (!db || !changes.length || sendBtn.disabled) return;
    sendBtn.disabled = true;
    setState('sending');
    const page = location.pathname.split('/').pop() || 'index.html';
    try {
      const ref = await db.collection('edits').add({ kind: 'page', page, changes, sentAt: Date.now() });
      const note = `Please apply my ${changes.length} design ${changes.length === 1 ? 'change' : 'changes'} to ${page}. They're stored as edits/${ref.id} in this page's database.`;
      if (canSend === 'available') {
        try {
          const first = document.querySelector(changes[0].path) || document.querySelector('h1');
          await comments.sendToClaude({ anchor: await comments.anchorFor(first), text: note });
          return setState('sent');
        } catch {
          refresh();
        }
      }
      setState('stored');
      saveEl.title = `Stored as edits/${ref.id}. Tell Claude in chat to apply it.`;
    } catch {
      setState('send-failed');
    } finally {
      sendBtn.disabled = !(window.pageEdits?.count);
    }
  });
})();
