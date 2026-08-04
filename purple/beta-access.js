(() => {
  "use strict";

  if (window.FuriousAcidBetaAccess) return;

  const STORAGE_KEY = "purple-rabbit-beta-access-v1";
  const STYLE_ID = "fa-beta-access-style";
  const ROOT_ID = "fa-beta-access";
  const ENDPOINT_META = 'meta[name="purple-beta-signup-endpoint"]';

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function readAccess() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value?.version === 1 && value.name && validEmail(value.email) ? value : null;
    } catch {
      return null;
    }
  }

  function writeAccess(value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function endpoint() {
    return document.querySelector(ENDPOINT_META)?.content?.trim() || "";
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID}, #${ROOT_ID} * { box-sizing: border-box; }
      #${ROOT_ID} {
        position: fixed; inset: 0; z-index: 2147483600; display: none;
        place-items: center; overflow: auto; padding: max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom));
        color: #251430; background: rgba(20, 9, 30, .94); font: 14px/1.45 Tahoma, "Segoe UI", sans-serif;
      }
      #${ROOT_ID}.fa-open { display: grid; }
      .fa-beta-card { width: min(430px, 100%); overflow: hidden; border: 2px solid #6f00ff; border-radius: 14px; background: #f7f3fb; box-shadow: 0 24px 80px #000a; }
      .fa-beta-head { display: grid; grid-template-columns: 62px 1fr; gap: 12px; align-items: center; padding: 14px 16px; color: #fff; background: linear-gradient(120deg, #4e0d91, #7a24d7); border-bottom: 4px solid #fdf200; }
      .fa-beta-head img { width: 62px; height: 62px; object-fit: contain; border: 2px solid #fdf200; border-radius: 9px; background: #fff; }
      .fa-beta-head span { color: #fff59d; letter-spacing: .14em; text-transform: uppercase; font-size: 10px; font-weight: 900; }
      .fa-beta-head h1 { margin: 2px 0 0; font-size: 25px; line-height: 1.05; }
      .fa-beta-form { display: grid; gap: 12px; padding: 18px; }
      .fa-beta-form > p { margin: 0; color: #564b5d; }
      .fa-beta-form label { display: grid; gap: 5px; font-weight: 800; }
      .fa-beta-form input[type="text"], .fa-beta-form input[type="email"] { width: 100%; min-height: 45px; padding: 8px 10px; border: 1px solid #a795b2; border-radius: 6px; background: #fff; color: #23132c; font: inherit; font-size: 16px; }
      .fa-beta-consent { grid-template-columns: 23px 1fr; align-items: start; gap: 8px !important; font-weight: 600 !important; }
      .fa-beta-consent input { width: 20px; height: 20px; margin: 1px 0 0; accent-color: #6f00ff; }
      .fa-beta-submit { min-height: 48px; border: 1px solid #350268; border-radius: 7px; color: #fff; background: linear-gradient(#7c28d8, #510d9a); font: 900 15px Tahoma, sans-serif; cursor: pointer; }
      .fa-beta-submit:disabled { opacity: .55; cursor: wait; }
      .fa-beta-error { min-height: 20px; margin: -3px 0 0 !important; color: #a01919 !important; font-weight: 800; }
      .fa-beta-note { padding: 10px 12px; border: 1px solid #ddce76; border-radius: 6px; background: #fff8c8; color: #574700 !important; font-size: 12px; }
      .fa-beta-account { z-index: 2147481500; display: none; align-items: center; gap: 6px; max-width: 180px; min-height: 28px; margin-left: 6px; padding: 4px 8px; overflow: hidden; border: 1px solid #fdf200; border-radius: 999px; color: #fff; background: #4d0b8e; font: 800 10px Tahoma, sans-serif; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
      .fa-beta-account.fa-ready { display: inline-flex; }
      html.fa-beta-locked, html.fa-beta-locked body { overflow: hidden !important; }
      @media (max-width: 720px) {
        #${ROOT_ID} { padding: 0; background: #1a0c24; }
        .fa-beta-card { width: 100%; min-height: 100dvh; border: 0; border-radius: 0; }
        .fa-beta-head { padding-top: max(12px, env(safe-area-inset-top)); }
        .fa-beta-form { padding-bottom: max(18px, env(safe-area-inset-bottom)); }
        .fa-beta-account { position: fixed; top: max(7px, env(safe-area-inset-top)); right: 7px; max-width: 120px; margin: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  function build() {
    installStyle();

    const root = document.createElement("section");
    root.id = ROOT_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Purple Rabbit beta access");
    root.innerHTML = `
      <div class="fa-beta-card">
        <header class="fa-beta-head">
          <img src="./purple-rabbit-adobe.webp" alt="">
          <div><span>Furious Acid signup beta</span><h1>Enter Purple Rabbit Chemistry</h1></div>
        </header>
        <form class="fa-beta-form" novalidate>
          <p>Create a free browser pass to try the working laboratory and video stage.</p>
          <label>Name<input name="name" type="text" autocomplete="name" maxlength="60" required></label>
          <label>Email<input name="email" type="email" inputmode="email" autocomplete="email" maxlength="160" required></label>
          <label class="fa-beta-consent"><input name="consent" type="checkbox" required><span>I understand this is a chemistry simulation and not a substitute for laboratory safety training.</span></label>
          <p class="fa-beta-note">This static-site beta saves its pass in this browser. No password is collected. When a signup endpoint is connected, the same form can register server-backed accounts without changing the laboratory.</p>
          <p class="fa-beta-error" role="alert" aria-live="polite"></p>
          <button class="fa-beta-submit" type="submit">Create beta access</button>
        </form>
      </div>
    `;
    document.body.appendChild(root);

    const account = document.createElement("button");
    account.className = "fa-beta-account";
    account.type = "button";
    account.title = "Clear this browser's beta access";
    document.querySelector(".window-titlebar")?.appendChild(account);
    if (!account.isConnected) document.body.appendChild(account);

    const form = root.querySelector("form");
    const submit = root.querySelector(".fa-beta-submit");
    const error = root.querySelector(".fa-beta-error");
    const appRoot = document.getElementById("root");

    function render(value = readAccess()) {
      const locked = !value;
      root.classList.toggle("fa-open", locked);
      root.setAttribute("aria-hidden", String(!locked));
      document.documentElement.classList.toggle("fa-beta-locked", locked);
      if (appRoot) appRoot.inert = locked;
      account.classList.toggle("fa-ready", !locked);
      account.textContent = value ? `${value.name} · Beta` : "";
      document.documentElement.dataset.betaAccess = locked ? "locked" : "ready";
      if (locked) window.setTimeout(() => form.elements.name?.focus(), 0);
    }

    async function submitAccess(event) {
      event.preventDefault();
      error.textContent = "";
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim().toLowerCase();
      if (name.length < 2) {
        error.textContent = "Enter your name.";
        return;
      }
      if (!validEmail(email)) {
        error.textContent = "Enter a valid email address.";
        return;
      }
      if (data.get("consent") !== "on") {
        error.textContent = "Check the simulation safety statement.";
        return;
      }

      const value = { version: 1, name, email, createdAt: new Date().toISOString(), mode: endpoint() ? "server" : "browser" };
      submit.disabled = true;
      submit.textContent = "Creating access…";
      try {
        if (endpoint()) {
          const response = await fetch(endpoint(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(value)
          });
          if (!response.ok) throw new Error("Signup service unavailable");
        }
        writeAccess(value);
        render(value);
        window.dispatchEvent(new CustomEvent("fa:beta-access", { detail: value }));
      } catch {
        error.textContent = "The signup service could not create access. Try again.";
      } finally {
        submit.disabled = false;
        submit.textContent = "Create beta access";
      }
    }

    form.addEventListener("submit", submitAccess);
    account.addEventListener("click", () => {
      if (!window.confirm("Clear this browser's Purple Rabbit beta access?")) return;
      localStorage.removeItem(STORAGE_KEY);
      form.reset();
      render(null);
    });

    window.FuriousAcidBetaAccess = {
      STORAGE_KEY,
      validEmail,
      read: readAccess,
      show: () => render(null),
      clear: () => { localStorage.removeItem(STORAGE_KEY); render(null); }
    };
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build, { once: true });
  else build();
})();
