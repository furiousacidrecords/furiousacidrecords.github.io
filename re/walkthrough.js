'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const world = byId('worldOverlay');
  const blanketCard = byId('blanketCard');
  const rideStage = byId('rideStage');
  const checkout = byId('checkoutCard');
  const rideBtn = byId('rideCart');
  const cart = byId('cartRig');
  const distanceEl = byId('distanceValue');
  const worldClose = byId('worldClose');
  const yesBtn = byId('blanketYes');
  const noBtn = byId('blanketNo');
  const mirrorDone = byId('mirrorDone');
  const mirrorSkip = byId('mirrorSkip');
  const mirrorPreview = byId('mirrorPreview');
  const worldFace = byId('worldFace');
  const checkoutBtn = byId('checkoutBtn');
  const checkoutNote = byId('checkoutNote');

  let riding = false;
  let distance = 0;
  let speed = 0;
  let raf = 0;
  let steer = 0;
  let dragging = false;
  let dragStartX = 0;
  let steerStart = 0;

  function openWorld() {
    if (!world) return;
    if (worldFace && mirrorPreview && mirrorPreview.src && !mirrorPreview.hidden) {
      worldFace.src = mirrorPreview.src;
      worldFace.hidden = false;
    }
    world.hidden = false;
    blanketCard.hidden = false;
    rideStage.hidden = true;
    checkout.classList.remove('show');
    document.body.style.overflow = 'hidden';
  }

  function closeWorld() {
    stopRide();
    if (world) world.hidden = true;
    document.body.style.overflow = '';
  }

  function enterRide() {
    blanketCard.hidden = true;
    rideStage.hidden = false;
  }

  function startRide() {
    if (riding) return;
    riding = true;
    distance = 0;
    speed = 2.2;
    checkout.classList.remove('show');
    world.classList.add('riding');
    rideBtn.textContent = 'LEAN / DRAG TO STEER';
    tick();
  }

  function stopRide() {
    riding = false;
    cancelAnimationFrame(raf);
    world?.classList.remove('riding');
  }

  function tick() {
    if (!riding) return;
    speed = Math.min(12, speed + 0.012);
    distance += speed;
    if (distanceEl) distanceEl.textContent = Math.floor(distance) + ' m';

    // The world starts to rush past as the cart gathers speed.
    if (world) {
      world.style.setProperty('--rush', String(Math.min(1, distance / 900)));
      world.style.setProperty('--world-scale', String(1 + Math.min(.55, distance / 2200)));
    }

    if (distance >= 1050 && !checkout.classList.contains('show')) {
      checkout.classList.add('show');
      stopRide();
    }
    raf = requestAnimationFrame(tick);
  }

  function setSteer(value) {
    steer = Math.max(-130, Math.min(130, value));
    cart?.style.setProperty('--steer', steer + 'px');
  }

  cart?.addEventListener('pointerdown', e => {
    dragging = true;
    dragStartX = e.clientX;
    steerStart = steer;
    cart.setPointerCapture?.(e.pointerId);
  });
  cart?.addEventListener('pointermove', e => {
    if (!dragging) return;
    setSteer(steerStart + (e.clientX - dragStartX));
  });
  cart?.addEventListener('pointerup', () => { dragging = false; });
  cart?.addEventListener('pointercancel', () => { dragging = false; });

  document.addEventListener('keydown', e => {
    if (!world || world.hidden || rideStage?.hidden) return;
    if (e.key === 'ArrowLeft') setSteer(steer - 18);
    if (e.key === 'ArrowRight') setSteer(steer + 18);
    if ((e.key === ' ' || e.key === 'Enter') && !riding && !checkout.classList.contains('show')) startRide();
  });

  yesBtn?.addEventListener('click', enterRide);
  noBtn?.addEventListener('click', enterRide);
  rideBtn?.addEventListener('click', startRide);
  worldClose?.addEventListener('click', closeWorld);

  // Whether they keep the mirror picture or skip it, the current keeps moving.
  mirrorDone?.addEventListener('click', () => setTimeout(openWorld, 180));
  mirrorSkip?.addEventListener('click', () => setTimeout(openWorld, 180));

  checkoutBtn?.addEventListener('click', () => {
    // The visual journey is live now. Real charging is intentionally not faked.
    // A Stripe payment link can be dropped into data-checkout-url when connected.
    const url = checkoutBtn.dataset.checkoutUrl;
    if (url) {
      window.location.href = url;
      return;
    }
    if (checkoutNote) {
      checkoutNote.textContent = 'The $5 checkout is staged and ready. Connect the payment link to make the charge live.';
    }
    checkoutBtn.textContent = 'CHECKOUT READY — $5';
  });
})();