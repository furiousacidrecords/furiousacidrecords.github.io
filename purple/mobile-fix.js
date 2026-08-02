(() => {
  "use strict";

  const viewport = document.querySelector('meta[name="viewport"]') || document.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content";
  if (!viewport.parentNode) document.head.appendChild(viewport);

  const style = document.createElement("style");
  style.id = "purple-mobile-scroll-fix";
  style.textContent = `
    html {
      width: 100% !important;
      min-height: 100% !important;
      height: auto !important;
      overflow-x: auto !important;
      overflow-y: auto !important;
      scroll-behavior: smooth;
    }

    body {
      width: 100% !important;
      min-height: 100svh !important;
      height: auto !important;
      max-height: none !important;
      overflow-x: auto !important;
      overflow-y: auto !important;
      position: relative !important;
      touch-action: pan-x pan-y pinch-zoom !important;
      overscroll-behavior-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }

    body.purple-phone-layout {
      padding-bottom: max(72px, env(safe-area-inset-bottom)) !important;
    }

    #root,
    #app,
    [data-reactroot],
    body > main {
      min-height: 100svh !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }

    #purple-orientation-button {
      position: fixed;
      right: max(12px, env(safe-area-inset-right));
      bottom: max(12px, env(safe-area-inset-bottom));
      z-index: 2147483646;
      display: none;
      align-items: center;
      gap: 8px;
      min-height: 46px;
      padding: 10px 14px;
      border: 2px solid #5f0aa6;
      border-radius: 999px;
      background: rgba(255,255,255,.96);
      color: #351049;
      box-shadow: 0 10px 28px rgba(35,8,53,.3);
      font: 800 13px/1.15 Arial, sans-serif;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    #purple-orientation-button span {
      font-size: 19px;
      line-height: 1;
    }

    #purple-orientation-message {
      position: fixed;
      left: 50%;
      bottom: max(72px, calc(env(safe-area-inset-bottom) + 72px));
      z-index: 2147483646;
      width: min(88vw, 390px);
      translate: -50% 12px;
      padding: 12px 15px;
      border: 1px solid rgba(104,22,164,.3);
      border-radius: 13px;
      background: rgba(31,12,42,.96);
      color: #fff;
      box-shadow: 0 14px 34px rgba(0,0,0,.35);
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease, translate .2s ease;
      text-align: center;
      font: 700 13px/1.35 Arial, sans-serif;
    }

    #purple-orientation-message.show {
      opacity: 1;
      translate: -50% 0;
    }

    @media (max-width: 920px) {
      body > div:not(#fa-realtime-loader):not(#purple-orientation-message) {
        max-height: none !important;
      }

      button,
      [role="button"],
      input,
      select {
        min-height: 42px;
      }
    }

    @media (max-width: 920px) and (orientation: portrait) {
      #purple-orientation-button { display: inline-flex; }
    }

    @media (orientation: landscape), (min-width: 921px) {
      #purple-orientation-button { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.id = "purple-orientation-button";
  button.type = "button";
  button.setAttribute("aria-label", "Open the laboratory in landscape view");
  button.innerHTML = '<span aria-hidden="true">↻</span> Landscape view';

  const message = document.createElement("div");
  message.id = "purple-orientation-message";
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");

  document.body.append(button, message);

  let messageTimer = 0;
  const showMessage = (text) => {
    message.textContent = text;
    message.classList.add("show");
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => message.classList.remove("show"), 4200);
  };

  const updatePhoneClass = () => {
    document.body.classList.toggle("purple-phone-layout", window.matchMedia("(max-width: 920px)").matches);
  };

  button.addEventListener("click", async () => {
    let locked = false;

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      }
    } catch (_) {
      // Fullscreen is optional. Continue to the orientation request.
    }

    try {
      if (screen.orientation && typeof screen.orientation.lock === "function") {
        await screen.orientation.lock("landscape");
        locked = true;
      }
    } catch (_) {
      locked = false;
    }

    showMessage(
      locked
        ? "Landscape view is on. Scroll normally to reach the entire laboratory."
        : "Turn the phone sideways. The laboratory will resize automatically and the whole page remains scrollable."
    );
  });

  updatePhoneClass();
  addEventListener("resize", updatePhoneClass, { passive: true });
  addEventListener("orientationchange", () => {
    updatePhoneClass();
    setTimeout(() => window.scrollTo({ top: window.scrollY, behavior: "auto" }), 180);
  }, { passive: true });

  // Some app layouts reapply overflow:hidden after rendering. Keep the document scrollable.
  const keepScrollable = () => {
    document.documentElement.style.setProperty("overflow-y", "auto", "important");
    document.body.style.setProperty("overflow-y", "auto", "important");
    document.body.style.setProperty("height", "auto", "important");
    document.body.style.setProperty("max-height", "none", "important");
  };

  keepScrollable();
  const observer = new MutationObserver(keepScrollable);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  observer.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
})();
