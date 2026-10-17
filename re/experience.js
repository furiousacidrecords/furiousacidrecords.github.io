'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const source = byId('source');
  const send = byId('send');
  const loadBtn = byId('load');
  const regenBtn = byId('regen');
  const mode = byId('mode');
  const transitions = byId('transitions');
  const randomize = byId('randomize');
  const out = byId('out');
  const chatStream = byId('chatStream');
  const chatMain = document.querySelector('.chat-main');
  const typingIndicator = byId('typingIndicator');
  const settingsPanel = byId('settingsPanel');
  const settingsToggle = byId('settingsToggle');
  const settingsClose = byId('settingsClose');
  const mirrorSurprise = byId('mirrorSurprise');
  const overlay = byId('mirrorOverlay');
  const mirrorFile = byId('mirrorFile');
  const mirrorPreview = byId('mirrorPreview');
  const mirrorBlank = byId('mirrorBlank');
  const mirrorClose = byId('mirrorClose');
  const mirrorSkip = byId('mirrorSkip');
  const mirrorDone = byId('mirrorDone');

  let submittedSource = '';
  let replyCount = 0;
  let mirrorShown = false;
  let nextReplyTimer = null;
  let objectUrl = null;
  let engineReady = false;
  let inTurn = false;
  const seenReplies = new Set();

  const rand = arr => arr[Math.floor(Math.random() * arr.length)];
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

  function withResolvedRandomSettings() {
    const restore = [];
    if (mode?.value === 'random') {
      restore.push([mode, 'random']);
      mode.value = rand(['formal', 'west']);
    }
    if (transitions?.value === 'random') {
      restore.push([transitions, 'random']);
      transitions.value = rand(['off', 'neutral', 'expressive']);
    }
    setTimeout(() => restore.forEach(([el, value]) => { el.value = value; }), 0);
  }
  loadBtn?.addEventListener('click', withResolvedRandomSettings, true);

  function scrollBottom() {
    requestAnimationFrame(() => { if (chatMain) chatMain.scrollTop = chatMain.scrollHeight; });
  }

  function addMessage(text, who) {
    if (!chatStream) return;
    const row = document.createElement('div');
    row.className = `message ${who === 'user' ? 'user-message' : 'assistant-message'}`;
    if (who !== 'user') {
      const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = '◌'; row.appendChild(avatar);
    }
    const bubble = document.createElement('div'); bubble.className = 'bubble';
    const speaker = document.createElement('span'); speaker.className = 'speaker'; speaker.textContent = who === 'user' ? 'You' : 'Chatbot';
    const body = document.createElement('div'); body.textContent = text;
    bubble.append(speaker, body); row.appendChild(bubble); chatStream.appendChild(row); scrollBottom();
  }

  function setTyping(on) {
    if (!typingIndicator) return;
    typingIndicator.hidden = !on;
    if (on) scrollBottom();
  }

  function triggerBuild() {
    if (!engineReady || !loadBtn || loadBtn.disabled) return false;
    loadBtn.click();
    return true;
  }

  function scheduleNextReply() {
    clearTimeout(nextReplyTimer);
    if (!inTurn || replyCount >= 3) return;
    nextReplyTimer = setTimeout(() => {
      if (!inTurn || replyCount >= 3 || !overlay?.hidden) return;
      setTyping(true);
      if (regenBtn && !regenBtn.disabled) {
        regenBtn.click();
      } else {
        // One more rebuild with fresh random settings can expose a different legal pool.
        if (mode) mode.value = 'random';
        if (transitions) transitions.value = 'random';
        triggerBuild();
      }
    }, 1150);
  }

  function showMirror() {
    clearTimeout(nextReplyTimer);
    inTurn = false;
    setTyping(false);
    if (!overlay || mirrorShown || !mirrorSurprise?.checked) return;
    mirrorShown = true;
    setTimeout(() => {
      overlay.hidden = false;
      mirrorClose?.focus();
    }, 450);
  }

  function handleEngineOutput() {
    if (!inTurn || !out) return;
    const text = clean(out.textContent);
    if (!text || text === '—') return;

    // Variant zero is the user's own wording. Do not pretend it is a chatbot reply.
    if (text.toLowerCase() === clean(submittedSource).toLowerCase()) {
      setTyping(true);
      setTimeout(() => {
        if (inTurn && regenBtn && !regenBtn.disabled) regenBtn.click();
        else if (inTurn) scheduleNextReply();
      }, 250);
      return;
    }

    const key = text.toLowerCase();
    if (seenReplies.has(key)) {
      scheduleNextReply();
      return;
    }
    seenReplies.add(key);
    setTyping(false);
    addMessage(text, 'assistant');
    replyCount += 1;

    if (replyCount >= 3) showMirror();
    else scheduleNextReply();
  }

  if (out) {
    new MutationObserver(handleEngineOutput).observe(out, { childList: true, characterData: true, subtree: true });
  }

  function startTurn() {
    const text = clean(source?.value);
    if (!text || !engineReady || inTurn) return;
    submittedSource = text;
    replyCount = 0;
    seenReplies.clear();
    inTurn = true;
    clearTimeout(nextReplyTimer);
    addMessage(text, 'user');
    setTyping(true);
    if (send) send.disabled = true;
    triggerBuild();
    setTimeout(() => { if (send) send.disabled = false; }, 650);
  }

  send?.addEventListener('click', startTurn);
  source?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startTurn(); }
  });
  source?.addEventListener('input', () => {
    if (!source) return;
    source.style.height = 'auto';
    source.style.height = Math.min(source.scrollHeight, 120) + 'px';
  });

  settingsToggle?.addEventListener('click', () => { if (settingsPanel) settingsPanel.hidden = false; });
  settingsClose?.addEventListener('click', () => { if (settingsPanel) settingsPanel.hidden = true; });

  randomize?.addEventListener('click', () => {
    if (mode) mode.value = 'random';
    if (transitions) transitions.value = 'random';
  });

  function hideMirror() { if (overlay) overlay.hidden = true; }
  mirrorClose?.addEventListener('click', hideMirror);
  mirrorSkip?.addEventListener('click', hideMirror);
  mirrorDone?.addEventListener('click', hideMirror);
  overlay?.addEventListener('click', e => { if (e.target === overlay) hideMirror(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay && !overlay.hidden) hideMirror(); });

  mirrorFile?.addEventListener('change', () => {
    const file = mirrorFile.files?.[0];
    if (!file) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    if (mirrorPreview) { mirrorPreview.src = objectUrl; mirrorPreview.hidden = false; }
    if (mirrorBlank) mirrorBlank.hidden = true;
    if (mirrorDone) mirrorDone.hidden = false;
  });

  // Engine controls still exist in Advanced, but the visible chat never needs them.
  if (loadBtn) loadBtn.textContent = 'REBUILD';

  if (send) send.disabled = true;
  const ready = () => { engineReady = true; if (send) send.disabled = false; };
  if (window.__compromiseReady?.then) window.__compromiseReady.then(ready).catch(ready);
  else setTimeout(ready, 250);
})();