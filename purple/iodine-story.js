(() => {
  "use strict";

  if (window.FuriousAcidIodineStory) return;

  const VIDEO_SRC = "./assets/iodine-pre-sublimation-app.mp4";
  const STYLE_ID = "fa-iodine-story-style";
  const OVERLAY_ID = "fa-iodine-story-overlay";

  const css = `
    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
      background: rgba(7, 8, 16, 0.94);
      color: #f7f7fb;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      opacity: 0;
      transition: opacity 260ms ease;
      box-sizing: border-box;
    }
    #${OVERLAY_ID}.fa-open { display: flex; }
    #${OVERLAY_ID}.fa-visible { opacity: 1; }
    #${OVERLAY_ID}, #${OVERLAY_ID} * { box-sizing: border-box; }
    .fa-story-shell {
      position: relative;
      width: min(980px, 100%);
      max-height: 96vh;
      overflow: hidden;
      border: 1px solid rgba(197, 173, 255, 0.35);
      border-radius: 24px;
      background: #11101a;
      box-shadow: 0 28px 90px rgba(0,0,0,.55);
    }
    .fa-story-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 58px;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,.10);
      background: #171522;
    }
    .fa-story-kicker { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: #bca9ef; font-weight: 800; }
    .fa-story-title { margin-top: 2px; font-size: clamp(17px, 3vw, 24px); font-weight: 800; }
    .fa-story-close, .fa-story-action, .fa-story-launcher {
      appearance: none;
      border: 0;
      cursor: pointer;
      font: inherit;
      font-weight: 800;
    }
    .fa-story-close {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      color: #fff;
      background: rgba(255,255,255,.12);
      font-size: 23px;
    }
    .fa-story-close:hover, .fa-story-close:focus-visible { background: rgba(255,255,255,.22); outline: 2px solid #ae8cff; outline-offset: 2px; }
    .fa-story-stage {
      position: relative;
      width: 100%;
      min-height: min(74vh, 760px);
      background: #f8f8fb;
    }
    .fa-story-scene {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      opacity: 0;
      visibility: hidden;
      transform: scale(.985);
      transition: opacity 620ms ease, transform 620ms ease, visibility 0s linear 620ms;
    }
    .fa-story-scene.fa-active {
      opacity: 1;
      visibility: visible;
      transform: scale(1);
      transition-delay: 0s;
    }
    .fa-video-scene { background: #f5f5f8; }
    .fa-video-frame {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: min(74vh, 760px);
      display: grid;
      place-items: center;
      overflow: hidden;
      background: radial-gradient(circle at 50% 30%, #ffffff 0, #f3f3f7 58%, #e9e9ef 100%);
    }
    .fa-story-video {
      display: block;
      height: min(74vh, 760px);
      width: auto;
      max-width: 100%;
      object-fit: contain;
      background: #fff;
    }
    .fa-scene-badge {
      position: absolute;
      left: 16px;
      top: 16px;
      z-index: 3;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(17,16,26,.88);
      color: #fff;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
      backdrop-filter: blur(6px);
    }
    .fa-video-caption {
      position: absolute;
      left: 50%;
      bottom: 16px;
      z-index: 3;
      transform: translateX(-50%);
      width: min(700px, calc(100% - 32px));
      padding: 10px 14px;
      border-radius: 14px;
      color: #fff;
      background: rgba(17,16,26,.88);
      text-align: center;
      font-size: clamp(14px, 2.2vw, 18px);
      font-weight: 750;
      backdrop-filter: blur(8px);
    }
    .fa-sublime-scene {
      overflow: hidden;
      background:
        radial-gradient(circle at 50% 15%, rgba(181,145,255,.20), transparent 34%),
        linear-gradient(180deg, #11101a 0%, #1a1427 48%, #0e0c15 100%);
    }
    .fa-sublime-wrap {
      position: relative;
      width: min(760px, 92%);
      height: min(68vh, 680px);
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 8px;
      align-items: center;
      justify-items: center;
      padding: 22px 12px 18px;
    }
    .fa-sublime-heading { text-align: center; z-index: 6; }
    .fa-sublime-heading h2 { margin: 0; font-size: clamp(28px, 5vw, 52px); line-height: 1.02; }
    .fa-sublime-heading p { margin: 8px 0 0; color: #cfc4e8; font-size: clamp(14px, 2.4vw, 19px); }
    .fa-apparatus {
      position: relative;
      width: min(420px, 82vw);
      height: min(440px, 48vh);
      min-height: 310px;
    }
    .fa-cold-surface {
      position: absolute;
      left: 50%;
      top: 5%;
      width: 42%;
      height: 16%;
      transform: translateX(-50%);
      border: 4px solid #d9d2ec;
      border-radius: 14px 14px 24px 24px;
      background: linear-gradient(180deg, rgba(240,247,255,.96), rgba(180,205,228,.68));
      box-shadow: inset 0 -8px 20px rgba(79,91,130,.22), 0 0 28px rgba(193,213,255,.20);
      z-index: 5;
    }
    .fa-deposit {
      position: absolute;
      left: 50%;
      top: 16%;
      width: 35%;
      height: 10%;
      transform: translateX(-50%);
      z-index: 7;
      opacity: 0;
      animation: fa-deposit 3.4s ease 2.2s forwards;
      filter: drop-shadow(0 2px 2px rgba(0,0,0,.6));
    }
    .fa-deposit::before, .fa-deposit::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(145deg, transparent 0 20%, #24202b 21% 28%, transparent 29% 42%, #35303d 43% 52%, transparent 53% 63%, #17151d 64% 72%, transparent 73%),
        linear-gradient(35deg, transparent 0 18%, #3d3549 19% 27%, transparent 28% 46%, #1c1922 47% 57%, transparent 58%);
    }
    .fa-flask {
      position: absolute;
      left: 50%;
      bottom: 3%;
      width: 76%;
      height: 77%;
      transform: translateX(-50%);
      border: 5px solid rgba(224,218,240,.90);
      border-radius: 46% 46% 43% 43% / 54% 54% 40% 40%;
      background: linear-gradient(110deg, rgba(255,255,255,.08), rgba(255,255,255,.015) 46%, rgba(209,188,255,.08));
      box-shadow: inset 22px 0 35px rgba(255,255,255,.04), inset -18px -20px 38px rgba(118,74,170,.10);
      overflow: hidden;
      z-index: 2;
    }
    .fa-flask::before {
      content: "";
      position: absolute;
      left: 50%;
      top: -31%;
      width: 26%;
      height: 39%;
      transform: translateX(-50%);
      border: 5px solid rgba(224,218,240,.90);
      border-bottom: 0;
      border-radius: 9px 9px 0 0;
      background: rgba(255,255,255,.025);
    }
    .fa-iodine-bed {
      position: absolute;
      left: 13%;
      right: 13%;
      bottom: 4%;
      height: 19%;
      border-radius: 50% 50% 38% 38%;
      background:
        radial-gradient(circle at 14% 45%, #4b414d 0 3px, transparent 4px),
        radial-gradient(circle at 32% 64%, #18161c 0 5px, transparent 6px),
        radial-gradient(circle at 55% 38%, #403849 0 4px, transparent 5px),
        radial-gradient(circle at 74% 58%, #17151b 0 6px, transparent 7px),
        radial-gradient(circle at 88% 36%, #504358 0 4px, transparent 5px),
        linear-gradient(180deg, #403746 0%, #19161f 76%);
      box-shadow: 0 -6px 28px rgba(108,70,143,.36), inset 0 8px 14px rgba(255,255,255,.04);
      z-index: 3;
    }
    .fa-vapor {
      position: absolute;
      left: 50%;
      bottom: 19%;
      width: 18%;
      height: 19%;
      transform: translateX(-50%);
      border-radius: 50%;
      background: radial-gradient(ellipse, rgba(154,87,220,.62) 0%, rgba(117,55,180,.26) 48%, transparent 72%);
      filter: blur(5px);
      opacity: 0;
      z-index: 4;
      animation: fa-rise 3.1s ease-in infinite;
    }
    .fa-vapor.v2 { left: 42%; width: 23%; animation-delay: .75s; animation-duration: 3.5s; }
    .fa-vapor.v3 { left: 59%; width: 16%; animation-delay: 1.5s; animation-duration: 2.8s; }
    .fa-vapor.v4 { left: 49%; width: 28%; animation-delay: 2.1s; animation-duration: 3.8s; }
    .fa-equation {
      z-index: 6;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 11px;
      flex-wrap: wrap;
      padding: 11px 18px;
      border: 1px solid rgba(196,169,255,.38);
      border-radius: 999px;
      background: rgba(27,22,39,.72);
      font-size: clamp(20px, 4vw, 34px);
      font-weight: 900;
      letter-spacing: .01em;
    }
    .fa-equation .fa-purple { color: #c398ff; }
    .fa-story-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 16px 15px;
      border-top: 1px solid rgba(255,255,255,.10);
      background: #171522;
    }
    .fa-story-action {
      min-height: 42px;
      padding: 10px 16px;
      border-radius: 12px;
      color: #fff;
      background: #6f34c5;
    }
    .fa-story-action.fa-secondary { background: rgba(255,255,255,.12); }
    .fa-story-action:hover, .fa-story-action:focus-visible { filter: brightness(1.15); outline: 2px solid #c3a8ff; outline-offset: 2px; }
    .fa-story-launcher {
      position: fixed;
      right: max(14px, env(safe-area-inset-right));
      bottom: max(14px, env(safe-area-inset-bottom));
      z-index: 2147482000;
      min-height: 48px;
      padding: 11px 16px;
      border-radius: 999px;
      color: #fff;
      background: linear-gradient(135deg, #5d22a8, #7b42d0);
      box-shadow: 0 12px 34px rgba(50,18,91,.42);
    }
    .fa-story-launcher:hover, .fa-story-launcher:focus-visible { filter: brightness(1.12); outline: 3px solid rgba(174,140,255,.55); outline-offset: 2px; }
    @keyframes fa-rise {
      0% { transform: translate(-50%, 0) scale(.65); opacity: 0; }
      18% { opacity: .72; }
      68% { opacity: .48; }
      100% { transform: translate(-50%, -235%) scale(1.5); opacity: 0; }
    }
    @keyframes fa-deposit { from { opacity: 0; transform: translateX(-50%) scale(.72); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
    @media (max-width: 620px) {
      .fa-story-shell { border-radius: 18px; max-height: 94vh; }
      .fa-story-stage, .fa-video-frame { min-height: 70vh; }
      .fa-story-video { height: 70vh; }
      .fa-sublime-wrap { height: 68vh; padding-top: 14px; }
      .fa-apparatus { transform: scale(.92); }
      .fa-story-controls { padding-bottom: max(13px, env(safe-area-inset-bottom)); }
      .fa-story-launcher { font-size: 14px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #${OVERLAY_ID}, .fa-story-scene { transition: none !important; }
      .fa-vapor { animation-duration: 7s; }
    }
  `;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function build() {
    if (document.getElementById(OVERLAY_ID)) return;
    installStyle();

    const overlay = document.createElement("section");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Iodine reaction and sublimation sequence");
    overlay.innerHTML = `
      <div class="fa-story-shell">
        <div class="fa-story-topbar">
          <div>
            <div class="fa-story-kicker">Purple Rabbit Chemistry</div>
            <div class="fa-story-title">Iodine: reaction sequence to sublimation</div>
          </div>
          <button class="fa-story-close" type="button" aria-label="Close sequence">×</button>
        </div>

        <div class="fa-story-stage">
          <section class="fa-story-scene fa-video-scene fa-active" data-fa-scene="reaction" aria-label="Second-to-last scene: exact uploaded reaction animation">
            <div class="fa-video-frame">
              <div class="fa-scene-badge">Second-to-last scene</div>
              <video class="fa-story-video" playsinline muted preload="metadata">
                <source src="${VIDEO_SRC}" type="video/mp4">
              </video>
              <div class="fa-video-caption">Exact uploaded reaction animation — preserved as made first</div>
            </div>
          </section>

          <section class="fa-story-scene fa-sublime-scene" data-fa-scene="sublimation" aria-label="Final scene: iodine sublimation">
            <div class="fa-scene-badge">Final scene</div>
            <div class="fa-sublime-wrap">
              <div class="fa-sublime-heading">
                <h2>Iodine sublimation</h2>
                <p>Violet iodine vapor rises and deposits as dark crystals on the cooler surface.</p>
              </div>
              <div class="fa-apparatus" aria-hidden="true">
                <div class="fa-cold-surface"></div>
                <div class="fa-deposit"></div>
                <div class="fa-flask">
                  <div class="fa-vapor v1"></div>
                  <div class="fa-vapor v2"></div>
                  <div class="fa-vapor v3"></div>
                  <div class="fa-vapor v4"></div>
                  <div class="fa-iodine-bed"></div>
                </div>
              </div>
              <div class="fa-equation"><span>I₂(s)</span><span class="fa-purple">⇌</span><span class="fa-purple">I₂(g)</span></div>
            </div>
          </section>
        </div>

        <div class="fa-story-controls">
          <button class="fa-story-action fa-secondary" data-fa-action="replay" type="button">Replay exact scene</button>
          <button class="fa-story-action" data-fa-action="next" type="button">Show sublimation</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const launcher = document.createElement("button");
    launcher.className = "fa-story-launcher";
    launcher.type = "button";
    launcher.textContent = "Play iodine finale";
    launcher.setAttribute("aria-label", "Play the reaction video followed by iodine sublimation");
    document.body.appendChild(launcher);

    const video = overlay.querySelector("video");
    const reaction = overlay.querySelector('[data-fa-scene="reaction"]');
    const sublimation = overlay.querySelector('[data-fa-scene="sublimation"]');
    const nextButton = overlay.querySelector('[data-fa-action="next"]');
    const replayButton = overlay.querySelector('[data-fa-action="replay"]');
    const closeButton = overlay.querySelector(".fa-story-close");

    let lastFocus = null;

    function showReaction(autoplay = true) {
      sublimation.classList.remove("fa-active");
      reaction.classList.add("fa-active");
      nextButton.textContent = "Show sublimation";
      video.currentTime = 0;
      if (autoplay) video.play().catch(() => {});
    }

    function showSublimation() {
      video.pause();
      reaction.classList.remove("fa-active");
      sublimation.classList.add("fa-active");
      nextButton.textContent = "Replay full sequence";
    }

    function open() {
      lastFocus = document.activeElement;
      overlay.classList.add("fa-open");
      requestAnimationFrame(() => overlay.classList.add("fa-visible"));
      showReaction(true);
      closeButton.focus({ preventScroll: true });
      document.documentElement.style.overflow = "hidden";
    }

    function close() {
      video.pause();
      overlay.classList.remove("fa-visible");
      window.setTimeout(() => overlay.classList.remove("fa-open"), 280);
      document.documentElement.style.overflow = "";
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus({ preventScroll: true });
    }

    video.addEventListener("ended", showSublimation);
    launcher.addEventListener("click", open);
    closeButton.addEventListener("click", close);
    replayButton.addEventListener("click", () => showReaction(true));
    nextButton.addEventListener("click", () => {
      if (sublimation.classList.contains("fa-active")) showReaction(true);
      else showSublimation();
    });
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.classList.contains("fa-open")) close();
    });

    window.FuriousAcidIodineStory = { play: open, close, showSublimation, replay: () => showReaction(true) };
    window.addEventListener("fa:iodine-story", open);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build, { once: true });
  else build();
})();
