'use strict';

(() => {
  const KEY = 'fa_consent_v1';
  const COOKIE = 'fa_consent';
  const banner = document.getElementById('faConsentBanner');
  const panel = document.getElementById('faConsentPanel');
  const settings = document.getElementById('faCookieSettings');
  const allowButtons = document.querySelectorAll('[data-fa-consent="analytics"]');
  const essentialButtons = document.querySelectorAll('[data-fa-consent="essential"]');
  const details = document.getElementById('faConsentDetails');
  const panelClose = document.getElementById('faConsentClose');
  const analyticsState = document.getElementById('faAnalyticsState');

  function readConsent() {
    try { return localStorage.getItem(KEY); } catch (_) { return null; }
  }

  function writeConsent(value) {
    try { localStorage.setItem(KEY, value); } catch (_) {}
    document.cookie = COOKIE + '=' + encodeURIComponent(value) + '; Max-Age=15552000; Path=/; SameSite=Lax; Secure';
    window.FuriousConsent = { analytics: value === 'analytics', essential: true, value };
    document.dispatchEvent(new CustomEvent('furious:consent', { detail: window.FuriousConsent }));
    if (window.FuriousConsent.analytics && typeof window.FuriousAnalytics?.enable === 'function') {
      window.FuriousAnalytics.enable();
    }
    updateState();
  }

  function updateState() {
    const value = readConsent();
    if (analyticsState) analyticsState.textContent = value === 'analytics' ? 'ALLOWED' : 'OFF';
    if (banner) banner.hidden = !!value;
  }

  function choose(value) {
    writeConsent(value);
    if (banner) banner.hidden = true;
    if (panel) panel.hidden = true;
  }

  allowButtons.forEach(btn => btn.addEventListener('click', () => choose('analytics')));
  essentialButtons.forEach(btn => btn.addEventListener('click', () => choose('essential')));
  details?.addEventListener('click', () => { if (panel) panel.hidden = false; });
  settings?.addEventListener('click', () => { if (panel) panel.hidden = false; });
  panelClose?.addEventListener('click', () => { if (panel) panel.hidden = true; });
  panel?.addEventListener('click', e => { if (e.target === panel) panel.hidden = true; });

  const existing = readConsent();
  window.FuriousConsent = { analytics: existing === 'analytics', essential: true, value: existing };
  updateState();
})();
