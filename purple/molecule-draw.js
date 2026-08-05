(() => {
  "use strict";

  if (window.FuriousAcidMoleculeDraw) return;

  const ROOT_ID = "fa-molecule-draw";
  const STYLE_ID = "fa-molecule-draw-style";
  const EDITOR_ID = "fa-molecule-editor";
  const JSME_SCRIPT_ID = "fa-jsme-editor-script";
  const JSME_CDN = "https://cdn.jsdelivr.net/npm/jsme-editor@2024.4.29/jsme.nocache.js";
  const JSME_FALLBACK = "https://jsme-editor.github.io/dist/jsme/jsme.nocache.js";
  const PUBCHEM_PROPERTIES = [
    "Title",
    "IUPACName",
    "MolecularFormula",
    "MolecularWeight",
    "SMILES",
    "ConnectivitySMILES",
    "InChIKey"
  ].join(",");

  let root;
  let launcher;
  let editor;
  let editorPromise;
  let previousFocus;
  let resizeTimer;

  const css = `
    .fa-molecule-launcher {
      position: fixed;
      right: max(10px, env(safe-area-inset-right));
      bottom: max(38px, env(safe-area-inset-bottom));
      z-index: 2147481400;
      min-height: 44px;
      padding: 9px 14px;
      border: 2px solid #fdf200;
      border-radius: 999px;
      color: #fff;
      background: #5b119f;
      box-shadow: 0 9px 28px #25063e66;
      font: 900 12px Tahoma, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .fa-molecule-launcher:hover,
    .fa-molecule-launcher:focus-visible {
      color: #24102e;
      background: #fdf200;
      outline: 3px solid #6f00ff;
      outline-offset: 2px;
    }

    #${ROOT_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483500;
      display: none;
      place-items: center;
      padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
      color: #281d2d;
      background: #14091edb;
      -webkit-backdrop-filter: blur(5px);
      backdrop-filter: blur(5px);
      font: 13px/1.4 Tahoma, "Segoe UI", sans-serif;
    }

    #${ROOT_ID}.fa-open { display: grid; }

    #${ROOT_ID} *,
    #${ROOT_ID} *::before,
    #${ROOT_ID} *::after { box-sizing: border-box; }

    .fa-molecule-window {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      width: min(1040px, 100%);
      height: min(820px, 100%);
      min-height: 480px;
      overflow: hidden;
      border: 2px solid #2d075f;
      border-radius: 11px;
      background: #f3f0f5;
      box-shadow: 0 24px 70px #0009, inset 0 0 0 1px #fff;
    }

    .fa-molecule-titlebar {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 58px;
      padding: 7px 10px;
      color: #fff;
      background: linear-gradient(90deg, #4c0b8d, #7422c8);
      border-bottom: 4px solid #fdf200;
    }

    .fa-molecule-mark {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 42px;
      height: 42px;
      border: 2px solid #fdf200;
      border-radius: 9px;
      color: #fdf200;
      background: #23043f;
      font: 900 21px/1 Tahoma, sans-serif;
    }

    .fa-molecule-titlebar span {
      display: block;
      color: #fff5a4;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .13em;
      text-transform: uppercase;
    }

    .fa-molecule-titlebar h2 {
      margin: 1px 0 0;
      font-size: 19px;
      line-height: 1.1;
    }

    .fa-molecule-close {
      width: 44px;
      height: 42px;
      margin-left: auto;
      border: 1px solid #ffffff66;
      border-radius: 7px;
      color: #fff;
      background: #ffffff14;
      font-size: 25px;
      cursor: pointer;
    }

    .fa-molecule-tabs {
      display: flex;
      gap: 5px;
      padding: 5px 7px 0;
      border-bottom: 1px solid #9b8ca5;
      background: linear-gradient(#f8f6fa, #dcd6e1);
    }

    .fa-molecule-tab {
      min-width: 150px;
      min-height: 40px;
      padding: 6px 13px;
      border: 1px solid #9e90a7;
      border-bottom: 0;
      border-radius: 7px 7px 0 0;
      color: #432451;
      background: #e7e1eb;
      font: 900 13px Tahoma, sans-serif;
      cursor: pointer;
    }

    .fa-molecule-tab[aria-selected="true"] {
      color: #fff;
      background: #6418ad;
      border-color: #3f076e;
      box-shadow: inset 0 3px #fdf200;
    }

    .fa-molecule-panel {
      min-height: 0;
      overflow: auto;
      padding: 10px;
      -webkit-overflow-scrolling: touch;
    }

    .fa-molecule-panel[hidden] { display: none; }

    .fa-draw-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 270px;
      gap: 10px;
      min-height: 100%;
    }

    .fa-molecule-editor-shell {
      min-width: 0;
      overflow: auto;
      border: 1px solid #817689;
      border-radius: 7px;
      background: #fff;
      box-shadow: inset 0 0 0 2px #ece7ef;
    }

    #${EDITOR_ID} {
      display: grid;
      place-items: center;
      min-width: 300px;
      min-height: 320px;
      color: #6a5e70;
      background: #fff;
    }

    .fa-editor-loading {
      max-width: 310px;
      padding: 18px;
      text-align: center;
    }

    .fa-draw-controls {
      align-self: start;
      display: grid;
      gap: 10px;
      padding: 13px;
      border: 1px solid #a89caf;
      border-radius: 7px;
      background: #fff;
    }

    .fa-draw-controls h3,
    .fa-result-card h3 { margin: 0; color: #4d0f72; font-size: 17px; }

    .fa-draw-controls p { margin: 0; color: #675d6d; }

    .fa-smiles-label {
      display: grid;
      gap: 5px;
      color: #4f4156;
      font-weight: 900;
    }

    .fa-smiles-input {
      width: 100%;
      min-height: 44px;
      padding: 8px;
      border: 1px solid #8f8297;
      border-radius: 5px;
      color: #211626;
      background: #fff;
      font: 14px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .fa-molecule-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
    }

    .fa-molecule-actions button,
    .fa-result-actions button,
    .fa-result-actions a {
      display: inline-grid;
      place-items: center;
      min-height: 44px;
      padding: 7px 10px;
      border: 1px solid #8e8096;
      border-radius: 6px;
      color: #41264f;
      background: #f5f2f7;
      font: 900 12px/1.2 Tahoma, sans-serif;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
    }

    .fa-molecule-actions .fa-identify,
    .fa-result-actions .fa-primary {
      grid-column: 1 / -1;
      color: #231129;
      border-color: #b3a600;
      background: #fdf200;
      box-shadow: inset 0 -3px #d2c700;
      font-size: 14px;
    }

    .fa-molecule-actions button:disabled,
    .fa-result-actions button:disabled { opacity: .48; cursor: not-allowed; }

    .fa-draw-note {
      padding: 8px;
      border-left: 4px solid #6f00ff;
      color: #4c3f52;
      background: #f1e7fa;
      font-size: 11px;
    }

    .fa-result-wrap {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 240px;
      gap: 12px;
      max-width: 900px;
      margin: 0 auto;
    }

    .fa-result-card,
    .fa-result-side {
      padding: 16px;
      border: 1px solid #a99cb1;
      border-radius: 8px;
      background: #fff;
    }

    .fa-result-status {
      margin: 0 0 12px;
      padding: 9px 11px;
      border: 1px solid #d7c85a;
      border-radius: 5px;
      color: #4c4100;
      background: #fff9c7;
      font-weight: 800;
    }

    .fa-iupac-name {
      display: block;
      margin: 8px 0 15px;
      overflow-wrap: anywhere;
      color: #5b119f;
      font: 900 clamp(21px, 4vw, 34px)/1.14 "Trebuchet MS", Tahoma, sans-serif;
    }

    .fa-result-list { margin: 0; }

    .fa-result-list div {
      display: grid;
      grid-template-columns: 145px minmax(0, 1fr);
      gap: 9px;
      padding: 8px 0;
      border-top: 1px solid #eee9f0;
    }

    .fa-result-list dt { color: #706476; font-weight: 900; }
    .fa-result-list dd { margin: 0; overflow-wrap: anywhere; }
    .fa-result-list code { font-size: 12px; }

    .fa-result-actions { display: grid; gap: 8px; }
    .fa-result-side p { color: #675d6d; font-size: 11px; }
    .fa-result-side strong { color: #4d0f72; }

    @media (max-width: 760px), (max-height: 520px) and (pointer: coarse) {
      #${ROOT_ID} { padding: 0; -webkit-backdrop-filter: none; backdrop-filter: none; }
      .fa-molecule-window { width: 100%; height: 100dvh; min-height: 0; border: 0; border-radius: 0; }
      .fa-molecule-titlebar { min-height: 56px; padding: 6px 8px; }
      .fa-molecule-mark { width: 40px; height: 40px; }
      .fa-molecule-titlebar h2 { font-size: 17px; }
      .fa-molecule-tabs { padding: 4px 4px 0; }
      .fa-molecule-tab { flex: 1; min-width: 0; min-height: 43px; padding: 6px 4px; font-size: 12px; }
      .fa-molecule-panel { padding: 6px; }
      .fa-draw-layout,
      .fa-result-wrap { grid-template-columns: 1fr; }
      .fa-draw-controls { padding: 10px; }
      .fa-draw-controls h3 { display: none; }
      .fa-draw-controls > p { font-size: 11px; }
      .fa-result-card,
      .fa-result-side { padding: 12px; }
      .fa-result-list div { grid-template-columns: 105px minmax(0, 1fr); }
      .fa-result-side { margin-bottom: max(8px, env(safe-area-inset-bottom)); }
    }

    @media (max-width: 430px) {
      .fa-molecule-launcher { right: 8px; bottom: max(36px, env(safe-area-inset-bottom)); max-width: 48vw; padding: 8px 10px; }
      .fa-molecule-actions { grid-template-columns: 1fr 1fr; }
      .fa-molecule-actions button { padding-inline: 5px; font-size: 11px; }
    }

    @media (prefers-reduced-motion: reduce) {
      #${ROOT_ID} { -webkit-backdrop-filter: none; backdrop-filter: none; }
    }
  `;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function editorSize() {
    const mobile = window.innerWidth <= 760 || Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
    return {
      width: Math.max(300, Math.floor(Math.min(980, window.innerWidth - (mobile ? 14 : 355)))),
      height: mobile
        ? Math.max(280, Math.floor(Math.min(460, window.innerHeight - 310)))
        : Math.max(380, Math.floor(Math.min(620, window.innerHeight - 190)))
    };
  }

  function createEditor() {
    if (editor) return editor;
    if (!window.JSApplet?.JSME) throw new Error("The molecule drawing library did not initialize.");
    const size = editorSize();
    const host = document.getElementById(EDITOR_ID);
    host.textContent = "";
    editor = new window.JSApplet.JSME(EDITOR_ID, `${size.width}px`, `${size.height}px`, {
      options: "newlook,autoez,canonize,stereo,hydrogens,removehs,valenceState,noquery,noreaction,nomarker",
      guicolor: "#f4f0f7",
      guiAtomColor: "#2c083f"
    });
    if (typeof editor.setCallBack === "function") {
      editor.setCallBack("AfterStructureModified", () => {
        const smiles = getSmiles();
        root.querySelector(".fa-smiles-input").value = smiles;
        clearResult("Drawing changed. Tap Identify molecule when ready.");
      });
    }
    root.querySelector(".fa-identify").disabled = false;
    root.querySelector(".fa-load-smiles").disabled = false;
    root.querySelector(".fa-clear-drawing").disabled = false;
    return editor;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const oldScript = document.getElementById(JSME_SCRIPT_ID);
      oldScript?.remove();
      const script = document.createElement("script");
      script.id = JSME_SCRIPT_ID;
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.addEventListener("error", () => reject(new Error("Could not load the molecule editor.")), { once: true });
      script.addEventListener("load", resolve, { once: true });
      document.head.appendChild(script);
    });
  }

  function ensureEditor() {
    if (editor) return Promise.resolve(editor);
    if (window.JSApplet?.JSME) return Promise.resolve(createEditor());
    if (editorPromise) return editorPromise;

    editorPromise = new Promise((resolve, reject) => {
      const previousOnLoad = window.jsmeOnLoad;
      let finished = false;
      const timeout = window.setTimeout(() => finish(new Error("The molecule editor took too long to load.")), 18000);

      function finish(error) {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeout);
        if (error) {
          editorPromise = null;
          reject(error);
          return;
        }
        try {
          resolve(createEditor());
        } catch (creationError) {
          editorPromise = null;
          reject(creationError);
        }
      }

      window.jsmeOnLoad = () => {
        try { if (typeof previousOnLoad === "function") previousOnLoad(); } catch { /* Another widget must not block this editor. */ }
        finish();
      };

      loadScript(JSME_CDN)
        .catch(() => loadScript(JSME_FALLBACK))
        .then(() => {
          if (window.JSApplet?.JSME) finish();
        })
        .catch(finish);
    });

    return editorPromise;
  }

  function getSmiles() {
    if (!editor || typeof editor.smiles !== "function") return root?.querySelector(".fa-smiles-input")?.value.trim() || "";
    try { return String(editor.smiles() || "").trim(); } catch { return ""; }
  }

  async function loadSmiles(value) {
    const input = String(value ?? root.querySelector(".fa-smiles-input").value).trim();
    if (!input) {
      setDrawMessage("Paste a SMILES string first, or draw directly in the white editor.");
      return false;
    }
    try {
      const activeEditor = await ensureEditor();
      activeEditor.readGenericMolecularInput(input);
      const normalized = getSmiles() || input;
      root.querySelector(".fa-smiles-input").value = normalized;
      clearResult("Structure loaded. Tap Identify molecule when ready.");
      setDrawMessage("Structure loaded into the drawing window.");
      return true;
    } catch (error) {
      setDrawMessage(error.message || "That structure could not be loaded.", true);
      return false;
    }
  }

  function clearDrawing() {
    if (editor && typeof editor.reset === "function") editor.reset();
    else if (editor && typeof editor.readGenericMolecularInput === "function") editor.readGenericMolecularInput("");
    root.querySelector(".fa-smiles-input").value = "";
    clearResult("Draw a molecule, then tap Identify molecule.");
    setDrawMessage("Blank drawing ready.");
  }

  function setDrawMessage(message, isError = false) {
    const element = root.querySelector(".fa-draw-note");
    element.textContent = message;
    element.style.borderLeftColor = isError ? "#c91616" : "#6f00ff";
    element.style.background = isError ? "#ffe5e5" : "#f1e7fa";
  }

  function selectTab(name) {
    for (const tab of root.querySelectorAll(".fa-molecule-tab")) {
      const selected = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const panel of root.querySelectorAll(".fa-molecule-panel")) panel.hidden = panel.dataset.panel !== name;
    if (name === "draw" && editor) resizeEditor();
  }

  function setField(selector, value) {
    root.querySelector(selector).textContent = value == null || value === "" ? "—" : String(value);
  }

  function clearResult(message) {
    setField(".fa-iupac-name", "No identification yet");
    setField(".fa-result-title", "—");
    setField(".fa-result-formula", "—");
    setField(".fa-result-weight", "—");
    setField(".fa-result-smiles", "—");
    setField(".fa-result-inchikey", "—");
    root.querySelector(".fa-result-status").textContent = message;
    root.querySelector(".fa-copy-name").disabled = true;
    root.querySelector(".fa-copy-smiles").disabled = true;
    const link = root.querySelector(".fa-pubchem-link");
    link.hidden = true;
    link.removeAttribute("href");
  }

  function normalizeResult(property, fallbackSmiles) {
    return {
      cid: property?.CID ?? null,
      title: property?.Title || "",
      iupacName: property?.IUPACName || "",
      formula: property?.MolecularFormula || "",
      molecularWeight: property?.MolecularWeight || "",
      smiles: property?.SMILES || property?.IsomericSMILES || property?.ConnectivitySMILES || property?.CanonicalSMILES || fallbackSmiles,
      inchiKey: property?.InChIKey || ""
    };
  }

  async function lookupPubChem(smiles, fetchImpl = window.fetch.bind(window)) {
    const base = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/property/${PUBCHEM_PROPERTIES}/JSON`;
    let response;
    try {
      response = await fetchImpl(base, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ smiles }).toString()
      });
    } catch {
      response = null;
    }

    if (!response?.ok) {
      try {
        response = await fetchImpl(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/property/${PUBCHEM_PROPERTIES}/JSON`);
      } catch {
        response = null;
      }
    }

    if (!response) throw new Error("The identification service is unreachable. Your drawing is still here.");
    if (response.status === 404 || response.status === 400) return null;
    if (!response.ok) throw new Error(`PubChem lookup failed (${response.status}). Try again in a moment.`);
    const payload = await response.json();
    const property = payload?.PropertyTable?.Properties?.[0];
    return property ? normalizeResult(property, smiles) : null;
  }

  function showResult(result, sourceSmiles) {
    setField(".fa-iupac-name", result.iupacName || "No IUPAC name returned");
    setField(".fa-result-title", result.title);
    setField(".fa-result-formula", result.formula);
    setField(".fa-result-weight", result.molecularWeight ? `${result.molecularWeight} g/mol` : "—");
    setField(".fa-result-smiles", result.smiles || sourceSmiles);
    setField(".fa-result-inchikey", result.inchiKey);
    root.querySelector(".fa-result-status").textContent = result.iupacName
      ? "Exact structure match identified."
      : "The structure matched, but PubChem did not return an IUPAC name.";
    root.querySelector(".fa-copy-name").disabled = !result.iupacName;
    root.querySelector(".fa-copy-smiles").disabled = !(result.smiles || sourceSmiles);
    const link = root.querySelector(".fa-pubchem-link");
    if (result.cid) {
      link.href = `https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(result.cid)}`;
      link.hidden = false;
    }
  }

  async function identify() {
    let smiles = getSmiles();
    if (!smiles) {
      const input = root.querySelector(".fa-smiles-input").value.trim();
      if (input) {
        const loaded = await loadSmiles(input);
        if (loaded) smiles = getSmiles() || input;
      }
    }
    if (!smiles) {
      setDrawMessage("Draw a molecule first, or paste a SMILES string.", true);
      selectTab("draw");
      return null;
    }

    root.querySelector(".fa-smiles-input").value = smiles;
    selectTab("result");
    clearResult("Identifying the exact structure…");
    const buttons = root.querySelectorAll(".fa-identify");
    buttons.forEach((button) => { button.disabled = true; });
    try {
      const result = await lookupPubChem(smiles);
      if (!result) {
        setField(".fa-iupac-name", "No exact database match");
        setField(".fa-result-smiles", smiles);
        root.querySelector(".fa-result-status").textContent = "No exact PubChem record matched this drawing. Check the atoms, charges, bonds, and stereochemistry.";
        root.querySelector(".fa-copy-smiles").disabled = false;
        return null;
      }
      showResult(result, smiles);
      return result;
    } catch (error) {
      setField(".fa-iupac-name", "Identification unavailable");
      setField(".fa-result-smiles", smiles);
      root.querySelector(".fa-result-status").textContent = error.message || "The identification service is unavailable. Your drawing is still here.";
      root.querySelector(".fa-copy-smiles").disabled = false;
      return null;
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  async function copyText(value, button) {
    const text = String(value || "").trim();
    if (!text || text === "—") return false;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand?.("copy");
      area.remove();
      if (!copied) return false;
    }
    const old = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => { button.textContent = old; }, 1200);
    return true;
  }

  function resizeEditor() {
    if (!editor || !root.classList.contains("fa-open") || root.querySelector('[data-panel="draw"]').hidden) return;
    const size = editorSize();
    try {
      if (typeof editor.setSize === "function") editor.setSize(`${size.width}px`, `${size.height}px`);
      else {
        editor.setWidth?.(`${size.width}px`);
        editor.setHeight?.(`${size.height}px`);
      }
    } catch { /* The existing editor remains usable at its previous size. */ }
  }

  function open() {
    previousFocus = document.activeElement;
    root.classList.add("fa-open");
    root.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    selectTab("draw");
    root.querySelector(".fa-molecule-close").focus({ preventScroll: true });
    ensureEditor().catch((error) => {
      const host = document.getElementById(EDITOR_ID);
      host.textContent = error.message || "The molecule editor could not load.";
      setDrawMessage("The drawing tool could not load. Check the connection and reopen this window.", true);
    });
  }

  function close() {
    root.classList.remove("fa-open");
    root.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    previousFocus?.focus?.({ preventScroll: true });
  }

  function build() {
    installStyle();
    launcher = document.createElement("button");
    launcher.className = "fa-molecule-launcher";
    launcher.type = "button";
    launcher.textContent = "⌬ Molecule / IUPAC";
    launcher.setAttribute("aria-label", "Open molecule drawing and IUPAC identification");
    document.body.appendChild(launcher);

    root = document.createElement("section");
    root.id = ROOT_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "fa-molecule-title");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <div class="fa-molecule-window">
        <header class="fa-molecule-titlebar">
          <div class="fa-molecule-mark" aria-hidden="true">⌬</div>
          <div><span>Purple Rabbit Chemistry</span><h2 id="fa-molecule-title">Molecule draw + identify</h2></div>
          <button class="fa-molecule-close" type="button" aria-label="Close molecule drawing window">×</button>
        </header>
        <nav class="fa-molecule-tabs" role="tablist" aria-label="Molecule drawing tabs">
          <button class="fa-molecule-tab" type="button" role="tab" data-tab="draw" aria-controls="fa-draw-panel" aria-selected="true">1 · Draw molecule</button>
          <button class="fa-molecule-tab" type="button" role="tab" data-tab="result" aria-controls="fa-result-panel" aria-selected="false" tabindex="-1">2 · IUPAC result</button>
        </nav>
        <section class="fa-molecule-panel" id="fa-draw-panel" role="tabpanel" data-panel="draw">
          <div class="fa-draw-layout">
            <div class="fa-molecule-editor-shell"><div id="${EDITOR_ID}"><p class="fa-editor-loading">Loading molecule drawing tools…</p></div></div>
            <aside class="fa-draw-controls">
              <h3>Draw the structure</h3>
              <p>Tap an atom or bond tool, then tap and drag in the white area.</p>
              <label class="fa-smiles-label">SMILES (optional)<input class="fa-smiles-input" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Example: CCO"></label>
              <div class="fa-molecule-actions">
                <button class="fa-load-smiles" type="button" disabled>Load SMILES</button>
                <button class="fa-clear-drawing" type="button" disabled>Clear</button>
                <button class="fa-identify" type="button" disabled>Identify molecule →</button>
              </div>
              <p class="fa-draw-note" role="status">The editor opens ready for finger drawing.</p>
            </aside>
          </div>
        </section>
        <section class="fa-molecule-panel" id="fa-result-panel" role="tabpanel" data-panel="result" hidden>
          <div class="fa-result-wrap">
            <article class="fa-result-card">
              <p class="fa-result-status" aria-live="polite">Draw a molecule, then tap Identify molecule.</p>
              <h3>IUPAC name</h3>
              <strong class="fa-iupac-name">No identification yet</strong>
              <dl class="fa-result-list">
                <div><dt>PubChem title</dt><dd class="fa-result-title">—</dd></div>
                <div><dt>Formula</dt><dd class="fa-result-formula">—</dd></div>
                <div><dt>Molar mass</dt><dd class="fa-result-weight">—</dd></div>
                <div><dt>SMILES</dt><dd><code class="fa-result-smiles">—</code></dd></div>
                <div><dt>InChIKey</dt><dd><code class="fa-result-inchikey">—</code></dd></div>
              </dl>
            </article>
            <aside class="fa-result-side">
              <div class="fa-result-actions">
                <button class="fa-identify fa-primary" type="button">Identify again</button>
                <button class="fa-copy-name" type="button" disabled>Copy IUPAC name</button>
                <button class="fa-copy-smiles" type="button" disabled>Copy SMILES</button>
                <a class="fa-pubchem-link" href="#" target="_blank" rel="noopener noreferrer" hidden>Open PubChem ↗</a>
                <button class="fa-back-to-draw" type="button">← Back to drawing</button>
              </div>
              <p><strong>Identification source:</strong> PubChem exact-structure lookup. A novel or unregistered structure can still be drawn and copied as SMILES even when no database name is available.</p>
            </aside>
          </div>
        </section>
      </div>
    `;
    document.body.appendChild(root);

    launcher.addEventListener("click", open);
    root.querySelector(".fa-molecule-close").addEventListener("click", close);
    root.querySelectorAll(".fa-molecule-tab").forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.tab)));
    root.querySelector(".fa-load-smiles").addEventListener("click", () => loadSmiles());
    root.querySelector(".fa-smiles-input").addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); loadSmiles(); }
    });
    root.querySelector(".fa-clear-drawing").addEventListener("click", clearDrawing);
    root.querySelectorAll(".fa-identify").forEach((button) => button.addEventListener("click", identify));
    root.querySelector(".fa-back-to-draw").addEventListener("click", () => selectTab("draw"));
    root.querySelector(".fa-copy-name").addEventListener("click", (event) => copyText(root.querySelector(".fa-iupac-name").textContent, event.currentTarget));
    root.querySelector(".fa-copy-smiles").addEventListener("click", (event) => copyText(root.querySelector(".fa-result-smiles").textContent, event.currentTarget));
    root.addEventListener("click", (event) => { if (event.target === root) close(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root.classList.contains("fa-open")) close();
    });
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeEditor, 120);
    });

    window.FuriousAcidMoleculeDraw = {
      open,
      close,
      identify,
      loadSmiles,
      getSmiles,
      lookupPubChem,
      selectTab
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build, { once: true });
  else build();
})();
