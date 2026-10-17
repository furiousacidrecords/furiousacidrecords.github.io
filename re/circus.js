'use strict';

(() => {
  const modal = document.querySelector('.mirror-modal');
  const upload = document.querySelector('.mirror-upload');
  const file = document.getElementById('mirrorFile');
  if (!modal || !upload) return;

  let leaveTimer = null;
  const on = () => {
    clearTimeout(leaveTimer);
    modal.classList.add('circus-mode');
  };
  const offSoon = () => {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      if (!upload.matches(':hover') && document.activeElement !== file) {
        modal.classList.remove('circus-mode');
      }
    }, 280);
  };

  upload.addEventListener('pointerenter', on);
  upload.addEventListener('pointerleave', offSoon);
  upload.addEventListener('pointerdown', on);
  upload.addEventListener('focusin', on);
  upload.addEventListener('focusout', offSoon);

  // On touch devices there is no real hover, so let the prize effect flash as the
  // chooser opens. If a picture is picked, keep the celebratory look briefly.
  upload.addEventListener('touchstart', on, { passive: true });
  file?.addEventListener('change', () => {
    if (!file.files?.length) return offSoon();
    on();
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => modal.classList.remove('circus-mode'), 2200);
  });
})();
