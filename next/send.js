// Send to Claude. The Figma-style controls (controls.js) are always on in the claude.ai
// preview; as soon as something has changed, a small pill appears at the bottom with the count
// and a Send to Claude button. Sending stores the changes in the preview's database (editors
// only) and posts a note that wakes the Claude session, which applies them to the site.
// Outside the preview there's nothing to send to, so none of this appears.
(() => {
  const pill = document.createElement('div');
  pill.className = 'send-pill';
  pill.setAttribute('role', 'status');
  pill.innerHTML =
    '<span class="send-count" aria-live="polite"></span>' +
    '<button type="button" class="send-button">Send to Claude</button>';
  const countEl = pill.querySelector('.send-count');
  const button = pill.querySelector('.send-button');

  let db = null;
  let comments = null;
  let canSend = 'off';
  let state = 'idle'; // idle | sending | sent | stored | failed

  const render = () => {
    const n = window.pageEdits?.count ?? 0;
    pill.classList.toggle('is-shown', n > 0 || state === 'sent' || state === 'stored');
    const what = `${n} ${n === 1 ? 'change' : 'changes'}`;
    countEl.textContent = {
      idle: what,
      sending: 'Sending…',
      sent: 'Sent to Claude',
      stored: 'Saved for Claude',
      failed: 'Couldn’t send',
    }[state];
    button.textContent = canSend === 'available' ? 'Send to Claude' : 'Save for Claude';
    button.hidden = state === 'sent' || state === 'stored';
    button.disabled = state === 'sending';
  };

  const refresh = async () => {
    try {
      canSend = comments ? await comments.canSendToClaude() : 'off';
    } catch {
      canSend = 'off';
    }
    render();
  };

  window.pageEdits?.onChange(() => {
    state = 'idle';
    render();
  });

  const inArtifact = !!window.claude?.use && window.top !== window;
  inArtifact &&
    Promise.all([claude.use('db').catch(() => null), claude.use('comments').catch(() => null)]).then(([d, c]) => {
      db = d;
      comments = c;
      if (!db) return;
      document.body.append(pill);
      refresh();
    });

  button.addEventListener('click', async () => {
    const changes = window.pageEdits?.list() ?? [];
    if (!db || !changes.length) return;
    state = 'sending';
    render();
    // the file to change: an article page, or the home page
    const page = location.pathname.match(/(writing\/)?[^/]+\.html$/)?.[0] ?? 'index.html';
    try {
      const ref = await db.collection('edits').add({ kind: 'page', page, changes, sentAt: Date.now() });
      const note = `Please apply my ${changes.length} ${changes.length === 1 ? 'change' : 'changes'} to ${page}. They're stored as edits/${ref.id} in this page's database.`;
      state = 'stored';
      if (canSend === 'available') {
        try {
          const first = document.querySelector(changes[0].path) || document.querySelector('h1');
          await comments.sendToClaude({ anchor: await comments.anchorFor(first), text: note });
          state = 'sent';
        } catch {
          refresh();
        }
      }
    } catch {
      state = 'failed';
    }
    window.uiSound?.(state === 'failed' ? 'error' : 'sent');
    render();
  });
})();
