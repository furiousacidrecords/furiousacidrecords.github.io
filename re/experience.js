'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const source = byId('source');
  const loadBtn = byId('load');
  const regenBtn = byId('regen');
  const mode = byId('mode');
  const transitions = byId('transitions');
  const autoBuild = byId('autoBuild');
  const autoRegen = byId('autoRegen');
  const autoSpeed = byId('autoSpeed');
  const mirrorSurprise = byId('mirrorSurprise');
  const randomize = byId('randomize');
  const overlay = byId('mirrorOverlay');
  const mirrorFile = byId('mirrorFile');
  const mirrorPreview = byId('mirrorPreview');
  const mirrorBlank = byId('mirrorBlank');
  const mirrorClose = byId('mirrorClose');
  const mirrorSkip = byId('mirrorSkip');
  const mirrorDone = byId('mirrorDone');

  let typingTimer = null;
  let cycleTimer = null;
  let typing = false;
  let regenCount = 0;
  let mirrorShown = false;
  let objectUrl = null;

  const rand = arr => arr[Math.floor(Math.random() * arr.length)];

  function withResolvedRandomSettings() {
    const restore = [];
    if (mode && mode.value === 'random') {
      restore.push([mode, 'random']);
      mode.value = rand(['formal', 'west']);
    }
    if (transitions && transitions.value === 'random') {
      restore.push([transitions, 'random']);
      transitions.value = rand(['off', 'neutral', 'expressive']);
    }
    setTimeout(() => restore.forEach(([el, value]) => { el.value = value; }), 0);
  }

  // Capture before the original E3 click handler reads the settings.
  loadBtn?.addEventListener('click', withResolvedRandomSettings, true);

  function triggerBuild() {
    if (!source || !source.value.trim() || !loadBtn || loadBtn.disabled) return;
    loadBtn.click();
  }

  function scheduleBuild() {
    if (!autoBuild?.checked) return;
    clearTimeout(typingTimer);
    typing = true;
    typingTimer = setTimeout(() => {
      typing = false;
      triggerBuild();
    }, 650);
  }

  source?.addEventListener('input', scheduleBuild);
  mode?.addEventListener('change', scheduleBuild);
  transitions?.addEventListener('change', scheduleBuild);
  byId('floor')?.addEventListener('change', scheduleBuild);
  byId('limit')?.addEventListener('change', scheduleBuild);

  function restartCycle() {
    clearInterval(cycleTimer);
    if (!autoRegen?.checked) return;
    const ms = Number(autoSpeed?.value || 4000);
    cycleTimer = setInterval(() => {
      if (typing || !overlay?.hidden) return;
      if (regenBtn && !regenBtn.disabled) regenBtn.click();
      else if (autoBuild?.checked) triggerBuild();
    }, ms);
  }

  autoRegen?.addEventListener('change', restartCycle);
  autoSpeed?.addEventListener('change', restartCycle);

  function showMirror() {
    if (!overlay || mirrorShown || !mirrorSurprise?.checked) return;
    mirrorShown = true;
    overlay.hidden = false;
    mirrorClose?.focus();
  }

  function hideMirror() {
    if (overlay) overlay.hidden = true;
  }

  regenBtn?.addEventListener('click', () => {
    regenCount += 1;
    if (regenCount === 3) setTimeout(showMirror, 220);
  });

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
    if (mirrorPreview) {
      mirrorPreview.src = objectUrl;
      mirrorPreview.hidden = false;
    }
    if (mirrorBlank) mirrorBlank.hidden = true;
    if (mirrorDone) mirrorDone.hidden = false;
  });

  randomize?.addEventListener('click', () => {
    if (mode) mode.value = 'random';
    if (transitions) transitions.value = 'random';
    triggerBuild();
  });

  // Make the old manual control read like a fallback, not a required step.
  if (loadBtn) loadBtn.textContent = 'REBUILD NOW';

  function firstBuild() {
    triggerBuild();
    restartCycle();
  }

  // Wait for the grammar library, then make the page feel alive immediately.
  if (window.__compromiseReady?.then) {
    window.__compromiseReady.then(firstBuild).catch(() => firstBuild());
  } else {
    setTimeout(firstBuild, 150);
  }
})();
