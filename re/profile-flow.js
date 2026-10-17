'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const file = byId('mirrorFile');
  const mirrorPreview = byId('mirrorPreview');
  const mirrorBlank = byId('mirrorBlank');
  const flow = byId('profileFlow');
  const loading = byId('profileLoading');
  const chooser = byId('profileChooser');
  const result = byId('profileResult');
  const original = byId('originalProfilePreview');
  const funhouseFace = byId('funhouseFace');
  const pickFun = byId('pickFunhouse');
  const pickOriginal = byId('pickOriginal');
  const pickDefault = byId('pickDefault');
  const pickNone = byId('pickNone');
  const resultTitle = byId('profileResultTitle');
  const resultCopy = byId('profileResultCopy');
  const resultDone = byId('profileResultDone');
  const overlay = byId('mirrorOverlay');

  let objectUrl = null;

  function showOnly(which) {
    [loading, chooser, result].forEach(el => { if (el) el.hidden = el !== which; });
    if (flow) flow.hidden = !which;
  }

  function startPreview(url) {
    if (original) original.src = url;
    if (funhouseFace) funhouseFace.src = url;
    showOnly(loading);

    // This pause is deliberate: it makes the transition feel like the site just
    // did something ridiculous to the picture. The current prototype composes a
    // local funhouse preview in-browser; a real image-to-image service can replace
    // this exact handoff later without changing the UX.
    setTimeout(() => showOnly(chooser), 1050);
  }

  file?.addEventListener('change', () => {
    const selected = file.files?.[0];
    if (!selected) return;

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(selected);

    if (mirrorPreview) {
      mirrorPreview.src = objectUrl;
      mirrorPreview.hidden = false;
    }
    if (mirrorBlank) mirrorBlank.hidden = true;

    startPreview(objectUrl);
  });

  function choose(kind) {
    const labels = {
      funhouse: ['Funhouse picture selected.', 'Yep. You picked the ridiculous grass version.'],
      original: ['Original picture selected.', 'Normal wins. Your uploaded picture is the choice.'],
      default: ['Default picture selected.', 'Back to the Furious Acid default. Completely reasonable.'],
      none: ['No picture selected.', 'Also completely reasonable.']
    };
    const [title, copy] = labels[kind];
    if (resultTitle) resultTitle.textContent = title;
    if (resultCopy) resultCopy.textContent = copy;
    try { sessionStorage.setItem('furiousacid.profileChoice', kind); } catch (_) {}
    showOnly(result);
  }

  pickFun?.addEventListener('click', () => choose('funhouse'));
  pickOriginal?.addEventListener('click', () => choose('original'));
  pickDefault?.addEventListener('click', () => choose('default'));
  pickNone?.addEventListener('click', () => choose('none'));

  resultDone?.addEventListener('click', () => {
    if (overlay) overlay.hidden = true;
  });
})();
