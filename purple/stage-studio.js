(() => {
  "use strict";

  if (window.FuriousAcidStageStudio) return;

  const STORAGE_KEY = "purple-rabbit-stage-project-v1";
  const LAST_SCENE_KEY = "purple-rabbit-last-scene";
  const STYLE_ID = "fa-stage-studio-style";
  const ROOT_ID = "fa-stage-studio";
  const PREVIEW_ID = "fa-stage-preview";
  const VIDEO_SRC = "./assets/iodine-pre-sublimation-app.mp4";
  const STAGE_WIDTH = 760;
  const STAGE_HEIGHT = 540;
  const CAPACITY = {
    beaker: 250,
    flask: 250,
    "test-tube": 30,
    burette: 50,
    "gas-jar": 300,
    "evaporating-dish": 100,
    burner: 0,
    balance: 0,
    bottle: 0
  };
  const APPARATUS = [
    ["beaker", "Beaker"],
    ["flask", "Conical flask"],
    ["test-tube", "Test tube"],
    ["burette", "Burette"],
    ["gas-jar", "Gas jar"],
    ["evaporating-dish", "Evaporating dish"],
    ["burner", "Bunsen burner"],
    ["balance", "Balance"]
  ];
  const VESSELS = new Set(["beaker", "flask", "test-tube", "burette", "gas-jar", "evaporating-dish"]);
  const ICON = {
    beaker: "▱",
    flask: "△",
    "test-tube": "┃",
    burette: "╿",
    "gas-jar": "▯",
    "evaporating-dish": "◡",
    burner: "♨",
    balance: "⚖",
    bottle: "▰"
  };

  let project;
  let selectedSceneId;
  let selectedObjectId = null;
  let drag = null;
  let previewTimer = null;
  let previewIndex = 0;
  let root;
  let preview;
  let stageHost;
  let sceneRail;
  let inspector;
  let status;

  function id(prefix = "item") {
    return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeIdentifier(value, prefix, used) {
    let candidate = String(value || "").trim();
    if (!/^[a-z0-9._:-]{1,120}$/i.test(candidate) || used.has(candidate)) candidate = id(prefix);
    used.add(candidate);
    return candidate;
  }

  function boundedNumber(value, fallback, minimum, maximum) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
  }

  function normalizeState(value, sceneName) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? clone(value) : {};
    const objectIds = new Set();
    source.version = 1;
    source.name = String(source.name || sceneName || "Laboratory scene").slice(0, 100);
    source.clock = boundedNumber(source.clock, 0, 0, 86400000);
    source.objects = (Array.isArray(source.objects) ? source.objects : [])
      .filter((item) => item && typeof item === "object" && !Array.isArray(item))
      .slice(0, 250)
      .map((item) => {
        const normalized = clone(item);
        normalized.id = safeIdentifier(item.id, "prop", objectIds);
        normalized.kind = [...APPARATUS.map(([kind]) => kind), "bottle"].includes(item.kind) ? item.kind : "beaker";
        normalized.x = boundedNumber(item.x, 40, 0, STAGE_WIDTH - 92);
        normalized.y = boundedNumber(item.y, 180, 0, STAGE_HEIGHT - 105);
        normalized.label = String(item.label || normalized.kind).slice(0, 80);
        normalized.capacity = boundedNumber(item.capacity, CAPACITY[normalized.kind] ?? 0, 0, 100000);
        normalized.temperature = boundedNumber(item.temperature, 21, -273.15, 3000);
        normalized.heating = Boolean(item.heating);
        normalized.contents = Object.fromEntries(Object.entries(item.contents && typeof item.contents === "object" && !Array.isArray(item.contents) ? item.contents : {})
          .filter(([key]) => /^[a-z0-9._:-]{1,120}$/i.test(key))
          .slice(0, 250)
          .map(([key, amount]) => [key, boundedNumber(amount, 0, 0, 100000)]));
        if (item.substanceId != null) normalized.substanceId = String(item.substanceId).slice(0, 120);
        return normalized;
      });
    return source;
  }

  function object(objectId, kind, x, y, label, contents = {}, substanceId) {
    return {
      id: objectId,
      kind,
      x,
      y,
      label,
      contents,
      capacity: CAPACITY[kind] ?? 0,
      temperature: 21,
      heating: false,
      ...(substanceId ? { substanceId } : {})
    };
  }

  function state(name, objects) {
    return { version: 1, name, clock: 0, objects };
  }

  function defaultProject() {
    const scenes = [
      {
        id: "iodine-layout",
        name: "Reactant layout",
        mode: "lab",
        durationMs: 2600,
        state: state("Iodine · reactant layout", [
          object("iodine-water", "beaker", 65, 245, "Water", { water: 25 }),
          object("iodine-acid", "bottle", 210, 255, "Hydrochloric acid", {}, "hcl"),
          object("iodine-peroxide", "bottle", 350, 255, "Hydrogen peroxide", {}, "hydrogen-peroxide"),
          object("iodine-iodide", "bottle", 495, 255, "Potassium iodide", {}, "ki"),
          object("iodine-balance", "balance", 570, 405, "Balance")
        ])
      },
      {
        id: "iodine-dissolve",
        name: "Dissolve iodide",
        mode: "lab",
        durationMs: 2400,
        state: state("Iodine · dissolve iodide", [
          object("dissolve-flask", "flask", 285, 220, "Iodide solution", { water: 25, ki: 20 }),
          object("dissolve-balance", "balance", 500, 390, "Balance"),
          object("dissolve-beaker", "beaker", 90, 265, "Rinse water", { water: 20 })
        ])
      },
      {
        id: "iodine-acid-stage",
        name: "Acid addition",
        mode: "lab",
        durationMs: 2400,
        state: state("Iodine · acid addition", [
          object("acid-flask", "flask", 310, 225, "Acidified iodide", { water: 25, ki: 20, hcl: 10 }),
          object("acid-bottle", "bottle", 105, 255, "Hydrochloric acid", {}, "hcl"),
          object("acid-gas-jar", "gas-jar", 520, 210, "Vent space")
        ])
      },
      {
        id: "iodine-oxidizer-stage",
        name: "Oxidizer addition",
        mode: "lab",
        durationMs: 2800,
        state: state("Iodine · oxidizer addition", [
          object("oxidizer-flask", "flask", 300, 220, "Reaction flask", { water: 25, ki: 20, hcl: 10, "hydrogen-peroxide": 10 }),
          object("oxidizer-bottle", "bottle", 90, 255, "Hydrogen peroxide", {}, "hydrogen-peroxide"),
          object("oxidizer-burner", "burner", 320, 405, "Heat source"),
          object("oxidizer-gas", "gas-jar", 520, 205, "Collection jar")
        ])
      },
      {
        id: "iodine-uploaded-video",
        name: "Exact uploaded reaction",
        mode: "video",
        durationMs: 5400,
        videoSrc: VIDEO_SRC
      },
      {
        id: "iodine-sublimation",
        name: "Sublimation finale",
        mode: "sublimation",
        durationMs: 4200
      }
    ];
    return { version: 1, title: "Iodine · editable laboratory sequence", updatedAt: new Date().toISOString(), scenes };
  }

  function normalizeProject(value) {
    if (value?.version !== 1 || !Array.isArray(value.scenes) || !value.scenes.length) return defaultProject();
    const sceneIds = new Set();
    return {
      version: 1,
      title: String(value.title || "Purple Rabbit stage project").slice(0, 100),
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
      scenes: value.scenes.slice(0, 100).map((scene, index) => {
        const source = scene && typeof scene === "object" && !Array.isArray(scene) ? scene : {};
        const name = String(source.name || `Scene ${index + 1}`).slice(0, 80);
        const mode = ["lab", "video", "sublimation"].includes(source.mode) ? source.mode : "lab";
        return {
          id: safeIdentifier(source.id, "scene", sceneIds),
          name,
          mode,
          durationMs: boundedNumber(source.durationMs, 2500, 500, 60000),
          ...(mode === "lab" ? { state: normalizeState(source.state, name) } : {}),
          ...(mode === "video" ? { videoSrc: String(source.videoSrc || VIDEO_SRC).slice(0, 1000) } : {})
        };
      })
    };
  }

  function readProject() {
    try {
      return normalizeProject(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    } catch {
      return defaultProject();
    }
  }

  function saveProject(message) {
    project.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    if (message) setStatus(message);
    window.dispatchEvent(new CustomEvent("fa:stage-project-change", { detail: clone(project) }));
  }

  function selectedScene() {
    return project.scenes.find((scene) => scene.id === selectedSceneId) || project.scenes[0];
  }

  function selectedObject(scene = selectedScene()) {
    return scene?.state?.objects?.find((item) => item.id === selectedObjectId) || null;
  }

  function parseCurrentState() {
    const objects = [...document.querySelectorAll(".workbench .lab-object")].map((element, index) => {
      const kindClass = [...element.classList].find((name) => name.startsWith("kind-"));
      const kind = kindClass?.slice(5) || "beaker";
      return object(
        element.dataset.objectId || id("prop"),
        kind,
        (Number.parseFloat(element.style.left) / 100) * STAGE_WIDTH || 40 + index * 80,
        (Number.parseFloat(element.style.top) / 100) * STAGE_HEIGHT || 180,
        element.querySelector(".object-label")?.textContent?.trim() || kind,
        {},
        kind === "bottle" ? undefined : null
      );
    });
    return state("Captured laboratory", objects);
  }

  function readBlob(blob) {
    if (typeof blob?.text === "function") return blob.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error("Unable to read scene"));
      reader.readAsText(blob);
    });
  }

  async function captureApplicationState() {
    const saveButton = document.querySelector('button[title="Save scene"]');
    if (!saveButton || !window.URL || !window.HTMLAnchorElement) return null;

    const urlApi = window.URL;
    const anchorPrototype = window.HTMLAnchorElement.prototype;
    const originalCreateObjectURL = urlApi.createObjectURL;
    const originalRevokeObjectURL = urlApi.revokeObjectURL;
    const originalAnchorClick = anchorPrototype.click;
    let capturedBlob = null;
    let capturedDownload = false;

    try {
      urlApi.createObjectURL = (blob) => {
        capturedBlob = blob;
        return "blob:purple-rabbit-stage-capture";
      };
      urlApi.revokeObjectURL = () => {};
      anchorPrototype.click = function click() {
        if (String(this.download || "").endsWith(".prc")) {
          capturedDownload = true;
          return;
        }
        return originalAnchorClick.call(this);
      };
      saveButton.click();
    } catch {
      capturedBlob = null;
    } finally {
      if (originalCreateObjectURL) urlApi.createObjectURL = originalCreateObjectURL;
      else delete urlApi.createObjectURL;
      if (originalRevokeObjectURL) urlApi.revokeObjectURL = originalRevokeObjectURL;
      else delete urlApi.revokeObjectURL;
      anchorPrototype.click = originalAnchorClick;
    }

    if (!capturedBlob || !capturedDownload) return null;
    try {
      const value = JSON.parse(await readBlob(capturedBlob));
      return value?.version === 1 && Array.isArray(value.objects) ? value : null;
    } catch {
      return null;
    }
  }

  function setStatus(message) {
    if (status) status.textContent = message || "";
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID}, #${ROOT_ID} *, #${PREVIEW_ID}, #${PREVIEW_ID} * { box-sizing: border-box; }
      .fa-stage-launcher { position: fixed; left: max(10px, env(safe-area-inset-left)); bottom: max(38px, env(safe-area-inset-bottom)); z-index: 2147481400; min-height: 44px; padding: 9px 13px; border: 2px solid #fdf200; border-radius: 999px; color: #fff; background: #5b119f; box-shadow: 0 9px 28px #25063e66; font: 900 12px Tahoma, sans-serif; cursor: pointer; }
      #${ROOT_ID} { position: fixed; inset: 0; z-index: 2147483100; display: none; grid-template-rows: auto minmax(0, 1fr) auto; color: #2b2031; background: #dad7dd; font: 12px/1.35 Tahoma, "Segoe UI", sans-serif; }
      #${ROOT_ID}.fa-open { display: grid; }
      .fa-stage-titlebar { display: flex; align-items: center; gap: 10px; min-height: 54px; padding: 7px 10px; color: #fff; background: linear-gradient(90deg, #4c0b8d, #7422c8); border-bottom: 4px solid #fdf200; }
      .fa-stage-titlebar img { width: 42px; height: 42px; object-fit: contain; border: 1px solid #fdf200; border-radius: 6px; background: #fff; }
      .fa-stage-titlebar span { display: block; color: #fff5a4; font-size: 9px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
      .fa-stage-titlebar h2 { margin: 1px 0 0; font-size: 18px; }
      .fa-stage-titlebar input { flex: 1; min-width: 120px; height: 36px; padding: 5px 8px; border: 1px solid #d9c7ed; border-radius: 5px; color: #fff; background: #30065f; font: 800 13px Tahoma, sans-serif; }
      .fa-stage-titlebar button { width: 42px; height: 40px; border: 1px solid #ffffff55; border-radius: 6px; color: #fff; background: #ffffff15; font-size: 22px; cursor: pointer; }
      .fa-stage-layout { min-height: 0; display: grid; grid-template-columns: 220px minmax(320px, 1fr) 250px; }
      .fa-stage-scenes, .fa-stage-inspector { min-height: 0; overflow: auto; background: #f2eff4; }
      .fa-stage-scenes { border-right: 1px solid #99919f; }
      .fa-stage-inspector { border-left: 1px solid #99919f; }
      .fa-stage-panel-head { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; min-height: 42px; padding: 7px 9px; color: #fff; background: #4d176b; }
      .fa-stage-panel-head button { min-height: 30px; border: 1px solid #c6a7d4; border-radius: 4px; color: #4d176b; background: #fff; font-weight: 900; cursor: pointer; }
      .fa-stage-scene-list { display: grid; gap: 7px; padding: 8px; }
      .fa-stage-scene-card { display: grid; grid-template-columns: 27px minmax(0, 1fr); gap: 6px; align-items: center; width: 100%; min-height: 58px; padding: 7px; border: 1px solid #aea3b4; border-left: 5px solid #8e7e96; border-radius: 5px; text-align: left; color: #332b37; background: #fff; cursor: pointer; }
      .fa-stage-scene-card.fa-selected { border-color: #6f00ff; border-left-color: #6f00ff; background: #f1e7fa; box-shadow: 0 0 0 2px #6f00ff22; }
      .fa-stage-scene-card b { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; color: #fff; background: #6f00ff; }
      .fa-stage-scene-card strong, .fa-stage-scene-card span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .fa-stage-scene-card span { margin-top: 2px; color: #736a78; font-size: 10px; }
      .fa-stage-center { min-width: 0; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr); background: #bbb7bd; }
      .fa-stage-toolbar { display: flex; gap: 5px; align-items: center; min-height: 44px; padding: 5px 7px; overflow: auto hidden; border-bottom: 1px solid #918b95; background: linear-gradient(#f8f7f9, #d8d4da); }
      .fa-stage-toolbar button, .fa-stage-inspector button { min-height: 32px; padding: 5px 8px; border: 1px solid #8f8793; border-radius: 4px; color: #392a40; background: #fff; font: 800 11px Tahoma, sans-serif; cursor: pointer; }
      .fa-stage-toolbar button.fa-primary, .fa-stage-inspector button.fa-primary { color: #fff; border-color: #3e076d; background: linear-gradient(#7d2bd4, #501091); }
      .fa-stage-toolbar button:disabled, .fa-stage-inspector button:disabled { opacity: .45; cursor: not-allowed; }
      .fa-stage-canvas-wrap { min-height: 0; display: grid; place-items: center; overflow: auto; padding: 10px; background: #8d8990; }
      .fa-stage-canvas { position: relative; width: min(100%, calc((100dvh - 130px) * 1.4074)); aspect-ratio: 760 / 540; min-width: 300px; overflow: hidden; border: 2px solid #443a47; background: #b3bd35 url("./assets/purple-startup-counter.png") center bottom / cover no-repeat; box-shadow: 0 12px 35px #0005; touch-action: none; }
      .fa-stage-canvas.fa-readonly .fa-stage-object { cursor: default; }
      .fa-stage-object { position: absolute; display: grid; place-items: center; width: 12.4%; min-width: 44px; aspect-ratio: .9; transform: translate(0, 0); border: 2px solid #604a68; border-radius: 7px; color: #2c1e31; background: #ffffffdf; box-shadow: 0 5px 14px #0004; cursor: grab; touch-action: none; user-select: none; }
      .fa-stage-object.fa-selected { border-color: #6f00ff; outline: 3px solid #fdf200; z-index: 5; }
      .fa-stage-object[data-kind="bottle"] { border-radius: 10px 10px 5px 5px; }
      .fa-stage-object[data-kind="burner"], .fa-stage-object[data-kind="balance"] { aspect-ratio: 1.4; }
      .fa-stage-object-icon { color: #531078; font: 900 clamp(21px, 4vw, 44px)/1 Georgia, serif; }
      .fa-stage-object label { position: absolute; left: 50%; bottom: -24px; max-width: 128px; min-width: 82px; padding: 3px 5px; transform: translateX(-50%); overflow: hidden; border: 1px solid #928799; border-radius: 3px; color: #312836; background: #fff; text-align: center; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; font-weight: 800; pointer-events: none; }
      .fa-stage-liquid { position: absolute; left: 9%; right: 9%; bottom: 8%; height: var(--fill, 0%); max-height: 56%; border-radius: 3px 3px 12px 12px; background: #8ad5e8aa; pointer-events: none; }
      .fa-stage-video { width: 100%; height: 100%; object-fit: contain; background: #fff; }
      .fa-stage-video-label { position: absolute; top: 12px; left: 12px; z-index: 2; padding: 7px 10px; border-radius: 999px; color: #fff; background: #211629dd; font-weight: 900; }
      .fa-stage-sublimation { width: 100%; height: 100%; display: grid; place-items: center; color: #fff; background: radial-gradient(circle at 50% 55%, #7b35a8, transparent 28%), #130e1b; text-align: center; }
      .fa-stage-sublimation strong { display: block; font-size: clamp(25px, 6vw, 56px); }
      .fa-stage-sublimation i { display: block; margin: 12px auto; width: 86px; height: 180px; border: 5px solid #ded4ec; border-radius: 45% 45% 38% 38%; background: linear-gradient(to top, #33263b 0 22%, #7b35a888 23% 62%, transparent 72%); animation: fa-stage-vapor 2.5s ease-in-out infinite alternate; }
      @keyframes fa-stage-vapor { to { filter: drop-shadow(0 -26px 18px #a955df); } }
      .fa-stage-inspector-body { display: grid; gap: 9px; padding: 10px; }
      .fa-stage-inspector-body label { display: grid; gap: 4px; font-weight: 800; }
      .fa-stage-inspector-body input, .fa-stage-inspector-body select { width: 100%; min-height: 36px; padding: 5px 7px; border: 1px solid #9d93a3; border-radius: 4px; background: #fff; font: inherit; font-size: 13px; }
      .fa-stage-inspector-body .fa-button-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .fa-stage-callout { margin: 0; padding: 8px; border: 1px solid #d0bf62; background: #fff8c9; color: #544500; }
      .fa-stage-object-controls { display: grid; gap: 6px; padding-top: 8px; border-top: 1px solid #c7c0cb; }
      .fa-stage-footer { display: flex; align-items: center; min-height: 30px; padding: 4px 9px; border-top: 1px solid #88818c; color: #3e3542; background: #d1ced3; }
      #${PREVIEW_ID} { position: fixed; inset: 0; z-index: 2147483400; display: none; grid-template-rows: auto minmax(0, 1fr) auto; padding: 12px; color: #fff; background: #09070dee; }
      #${PREVIEW_ID}.fa-open { display: grid; }
      .fa-preview-head, .fa-preview-controls { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: min(960px, 100%); margin: 0 auto; padding: 8px 10px; background: #21172a; }
      .fa-preview-head { border-radius: 10px 10px 0 0; }
      .fa-preview-controls { justify-content: center; border-radius: 0 0 10px 10px; }
      .fa-preview-head h2 { margin: 0; font-size: 17px; }
      .fa-preview-head button, .fa-preview-controls button { min-height: 38px; padding: 6px 12px; border: 1px solid #aa8ec0; border-radius: 5px; color: #fff; background: #5c1998; font-weight: 900; cursor: pointer; }
      .fa-preview-stage { width: min(960px, 100%); min-height: 0; display: grid; place-items: center; margin: 0 auto; overflow: auto; background: #26202a; }
      .fa-preview-stage .fa-stage-canvas { width: min(100%, calc((100dvh - 150px) * 1.4074)); }
      @media (max-width: 850px) {
        .fa-stage-layout { grid-template-columns: 180px minmax(280px, 1fr); }
        .fa-stage-inspector { position: absolute; z-index: 4; right: 0; top: 54px; bottom: 30px; width: min(300px, 82vw); box-shadow: -8px 0 24px #0005; }
      }
      @media (max-width: 620px) {
        .fa-stage-launcher { left: 7px; bottom: max(34px, env(safe-area-inset-bottom)); min-height: 40px; padding: 7px 10px; }
        #${ROOT_ID} { grid-template-rows: 52px minmax(0, 1fr) 28px; }
        .fa-stage-titlebar { min-height: 52px; padding: 5px 7px; }
        .fa-stage-titlebar img, .fa-stage-titlebar div { display: none; }
        .fa-stage-titlebar input { height: 40px; font-size: 14px; }
        .fa-stage-layout { grid-template-columns: 1fr; grid-template-rows: 92px minmax(0, 1fr); }
        .fa-stage-scenes { border: 0; border-bottom: 1px solid #99919f; overflow: auto hidden; }
        .fa-stage-panel-head { display: none; }
        .fa-stage-scene-list { grid-auto-flow: column; grid-auto-columns: 142px; display: grid; gap: 5px; padding: 5px; }
        .fa-stage-scene-card { min-height: 80px; }
        .fa-stage-center { grid-row: 2; }
        .fa-stage-toolbar { min-height: 45px; }
        .fa-stage-canvas-wrap { align-items: start; padding: 5px; }
        .fa-stage-canvas { width: 100%; min-width: 0; }
        .fa-stage-inspector { top: 52px; bottom: 28px; }
        #${PREVIEW_ID} { padding: 0; grid-template-rows: 52px minmax(0, 1fr) 55px; }
        .fa-preview-head, .fa-preview-controls { width: 100%; border-radius: 0; }
        .fa-preview-stage { width: 100%; }
        .fa-preview-stage .fa-stage-canvas { width: 100%; }
      }
      @media (prefers-reduced-motion: reduce) { .fa-stage-sublimation i { animation: none; } }
    `;
    document.head.appendChild(style);
  }

  function sceneMeta(scene) {
    if (scene.mode === "video") return "Video · exact upload";
    if (scene.mode === "sublimation") return "Animated finale";
    return `${scene.state?.objects?.length || 0} props · editable lab`;
  }

  function renderSceneRail() {
    sceneRail.innerHTML = project.scenes.map((scene, index) => `
      <button class="fa-stage-scene-card${scene.id === selectedSceneId ? " fa-selected" : ""}" type="button" data-scene-id="${escapeHtml(scene.id)}">
        <b>${index + 1}</b><span><strong>${escapeHtml(scene.name)}</strong><span>${escapeHtml(sceneMeta(scene))}</span></span>
      </button>
    `).join("");
    sceneRail.querySelectorAll("[data-scene-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedSceneId = button.dataset.sceneId;
        selectedObjectId = null;
        render();
      });
    });
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  function fillPercent(item) {
    if (!VESSELS.has(item.kind) || !item.capacity) return 0;
    const total = Object.values(item.contents || {}).reduce((sum, amount) => sum + Math.max(0, Number(amount) || 0), 0);
    return Math.max(0, Math.min(56, (total / item.capacity) * 56));
  }

  function renderLabScene(scene, host, editable = true) {
    const canvas = document.createElement("div");
    canvas.className = `fa-stage-canvas${editable ? "" : " fa-readonly"}`;
    canvas.dataset.sceneId = scene.id;
    for (const item of scene.state?.objects || []) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `fa-stage-object${item.id === selectedObjectId && editable ? " fa-selected" : ""}`;
      element.dataset.objectId = item.id;
      element.dataset.kind = item.kind;
      element.style.left = `${(item.x / STAGE_WIDTH) * 100}%`;
      element.style.top = `${(item.y / STAGE_HEIGHT) * 100}%`;
      element.style.setProperty("--fill", `${fillPercent(item)}%`);
      element.innerHTML = `<span class="fa-stage-liquid"></span><span class="fa-stage-object-icon">${ICON[item.kind] || "▰"}</span><label>${escapeHtml(item.label)}</label>`;
      if (editable) {
        element.addEventListener("pointerdown", startDrag);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          selectedObjectId = item.id;
          renderInspector();
          canvas.querySelectorAll(".fa-stage-object").forEach((node) => node.classList.toggle("fa-selected", node.dataset.objectId === item.id));
        });
      }
      canvas.appendChild(element);
    }
    if (editable) canvas.addEventListener("click", () => { selectedObjectId = null; renderInspector(); canvas.querySelectorAll(".fa-selected").forEach((node) => node.classList.remove("fa-selected")); });
    host.replaceChildren(canvas);
  }

  function renderSpecialScene(scene, host, autoplay = false) {
    const canvas = document.createElement("div");
    canvas.className = "fa-stage-canvas fa-readonly";
    if (scene.mode === "video") {
      canvas.innerHTML = `<span class="fa-stage-video-label">Second-to-last scene · exact uploaded video</span><video class="fa-stage-video" playsinline muted controls preload="metadata"><source src="${escapeHtml(scene.videoSrc || VIDEO_SRC)}" type="video/mp4"></video>`;
      if (autoplay) canvas.querySelector("video")?.play().catch(() => {});
    } else {
      canvas.innerHTML = `<div class="fa-stage-sublimation"><div><strong>Iodine sublimation</strong><i aria-hidden="true"></i><span>I₂(s) ⇌ I₂(g)</span></div></div>`;
    }
    host.replaceChildren(canvas);
  }

  function renderStage() {
    const scene = selectedScene();
    if (scene.mode === "lab") renderLabScene(scene, stageHost, true);
    else renderSpecialScene(scene, stageHost, false);
  }

  function renderInspector() {
    const scene = selectedScene();
    const item = selectedObject(scene);
    inspector.innerHTML = `
      <div class="fa-stage-panel-head"><strong>Scene properties</strong><button class="fa-hide-inspector" type="button">×</button></div>
      <div class="fa-stage-inspector-body">
        <label>Scene name<input class="fa-scene-name" value="${escapeHtml(scene.name)}" maxlength="80"></label>
        <label>Duration (seconds)<input class="fa-scene-duration" type="number" min="0.5" max="60" step="0.1" value="${(scene.durationMs / 1000).toFixed(1)}"></label>
        <p class="fa-stage-callout">Each scene owns an independent laboratory snapshot. The glassware can change completely from one scene to the next.</p>
        <div class="fa-button-grid">
          <button class="fa-capture-scene fa-primary" type="button">Capture lab</button>
          <button class="fa-load-scene" type="button" ${scene.mode === "lab" ? "" : "disabled"}>Edit in lab</button>
          <button class="fa-duplicate-scene" type="button">Duplicate</button>
          <button class="fa-delete-scene" type="button" ${project.scenes.length <= 1 ? "disabled" : ""}>Delete</button>
          <button class="fa-move-scene-up" type="button">Move earlier</button>
          <button class="fa-move-scene-down" type="button">Move later</button>
        </div>
        ${scene.mode === "lab" ? `
          <label>Add apparatus<select class="fa-add-kind">${APPARATUS.map(([kind, label]) => `<option value="${kind}">${label}</option>`).join("")}</select></label>
          <button class="fa-add-apparatus" type="button">Add to this scene</button>
          <p class="fa-stage-callout">Use <b>Edit in lab</b> for the full chemical library, quantities, heat, pouring, and live reaction calculations; then return and capture the scene.</p>
        ` : scene.mode === "video" ? `<button class="fa-play-exact fa-primary" type="button">Play exact uploaded video</button>` : `<button class="fa-play-finale fa-primary" type="button">Play full iodine finale</button>`}
        ${item ? `
          <div class="fa-stage-object-controls">
            <strong>Selected prop</strong>
            <label>Label<input class="fa-object-label" value="${escapeHtml(item.label)}" maxlength="80"></label>
            <button class="fa-delete-object" type="button">Remove prop from scene</button>
          </div>
        ` : ""}
      </div>
    `;

    inspector.querySelector(".fa-hide-inspector").addEventListener("click", () => inspector.hidden = true);
    inspector.querySelector(".fa-scene-name").addEventListener("input", (event) => { scene.name = event.target.value; saveProject(); renderSceneRail(); });
    inspector.querySelector(".fa-scene-duration").addEventListener("change", (event) => { scene.durationMs = Math.max(500, Math.min(60000, Number(event.target.value) * 1000 || 2500)); saveProject("Scene duration updated."); });
    inspector.querySelector(".fa-capture-scene").addEventListener("click", captureCurrent);
    inspector.querySelector(".fa-load-scene").addEventListener("click", () => loadSceneIntoLab(scene));
    inspector.querySelector(".fa-duplicate-scene").addEventListener("click", duplicateScene);
    inspector.querySelector(".fa-delete-scene").addEventListener("click", deleteScene);
    inspector.querySelector(".fa-move-scene-up").addEventListener("click", () => moveScene(-1));
    inspector.querySelector(".fa-move-scene-down").addEventListener("click", () => moveScene(1));
    inspector.querySelector(".fa-add-apparatus")?.addEventListener("click", addApparatus);
    inspector.querySelector(".fa-play-exact")?.addEventListener("click", () => startPreview(project.scenes.indexOf(scene)));
    inspector.querySelector(".fa-play-finale")?.addEventListener("click", () => window.FuriousAcidIodineStory?.play?.());
    inspector.querySelector(".fa-object-label")?.addEventListener("input", (event) => { item.label = event.target.value; saveProject(); renderStage(); });
    inspector.querySelector(".fa-delete-object")?.addEventListener("click", deleteObject);
  }

  function render() {
    if (!project.scenes.some((scene) => scene.id === selectedSceneId)) selectedSceneId = project.scenes[0].id;
    root.querySelector(".fa-stage-project-title").value = project.title;
    renderSceneRail();
    renderStage();
    renderInspector();
  }

  function startDrag(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const element = event.currentTarget;
    const scene = selectedScene();
    const item = scene.state?.objects?.find((candidate) => candidate.id === element.dataset.objectId);
    const canvas = element.closest(".fa-stage-canvas");
    if (!item || !canvas) return;
    event.preventDefault();
    selectedObjectId = item.id;
    drag = { pointerId: event.pointerId, item, element, canvas, startX: event.clientX, startY: event.clientY, originX: item.x, originY: item.y };
    element.setPointerCapture?.(event.pointerId);
    element.classList.add("fa-selected");
    renderInspector();
  }

  function moveDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = drag.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    event.preventDefault();
    drag.item.x = Math.max(0, Math.min(STAGE_WIDTH - 92, drag.originX + ((event.clientX - drag.startX) / rect.width) * STAGE_WIDTH));
    drag.item.y = Math.max(0, Math.min(STAGE_HEIGHT - 105, drag.originY + ((event.clientY - drag.startY) / rect.height) * STAGE_HEIGHT));
    drag.element.style.left = `${(drag.item.x / STAGE_WIDTH) * 100}%`;
    drag.element.style.top = `${(drag.item.y / STAGE_HEIGHT) * 100}%`;
  }

  function endDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.element.releasePointerCapture?.(event.pointerId);
    drag = null;
    saveProject("Prop position saved in this scene.");
  }

  async function captureCurrent() {
    const scene = selectedScene();
    setStatus("Capturing the exact live laboratory state…");
    const liveState = await captureApplicationState();
    scene.mode = "lab";
    scene.state = normalizeState(liveState || parseCurrentState(), scene.name);
    selectedObjectId = null;
    saveProject(liveState
      ? "Exact laboratory contents, quantities, conditions, and layout captured in this scene."
      : "Laboratory layout captured. Use the full app's Save control if exact contents are unavailable in this browser.");
    render();
    return clone(scene.state);
  }

  function loadSceneIntoLab(scene = selectedScene(), options = {}) {
    if (!scene || scene.mode !== "lab" || !scene.state) return false;
    localStorage.setItem(LAST_SCENE_KEY, JSON.stringify(scene.state));
    const input = document.querySelector('input[type="file"][accept*=".prc"]');
    let loaded = false;
    try {
      if (input && typeof File === "function") {
        const file = new File([JSON.stringify(scene.state)], `${scene.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "scene"}.prc`, { type: "application/json" });
        if (typeof DataTransfer === "function") {
          const transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
        } else {
          Object.defineProperty(input, "files", { configurable: true, value: [file] });
        }
        input.dispatchEvent(new Event("change", { bubbles: true }));
        loaded = true;
      }
    } catch {
      loaded = false;
    }
    if (!loaded) {
      setStatus("This browser blocked loading the scene into the laboratory. Export it and use File → Open scene.");
      return false;
    }
    close();
    window.dispatchEvent(new CustomEvent("fa:stage-load-lab", { detail: clone(scene.state) }));
    return true;
  }

  function duplicateScene() {
    const scene = clone(selectedScene());
    scene.id = id("scene");
    scene.name = `${scene.name} copy`;
    if (scene.state?.objects) scene.state.objects = scene.state.objects.map((item) => ({ ...item, id: id("prop") }));
    const index = project.scenes.findIndex((item) => item.id === selectedSceneId);
    project.scenes.splice(index + 1, 0, scene);
    selectedSceneId = scene.id;
    selectedObjectId = null;
    saveProject("Scene duplicated with an independent set of props.");
    render();
  }

  function deleteScene() {
    if (project.scenes.length <= 1) return;
    const index = project.scenes.findIndex((scene) => scene.id === selectedSceneId);
    project.scenes.splice(index, 1);
    selectedSceneId = project.scenes[Math.max(0, index - 1)].id;
    selectedObjectId = null;
    saveProject("Scene removed.");
    render();
  }

  function moveScene(direction) {
    const index = project.scenes.findIndex((scene) => scene.id === selectedSceneId);
    const destination = Math.max(0, Math.min(project.scenes.length - 1, index + direction));
    if (destination === index) return;
    const [scene] = project.scenes.splice(index, 1);
    project.scenes.splice(destination, 0, scene);
    saveProject("Scene order updated.");
    renderSceneRail();
  }

  function addApparatus() {
    const scene = selectedScene();
    if (scene.mode !== "lab") return;
    const kind = inspector.querySelector(".fa-add-kind").value;
    const label = APPARATUS.find(([value]) => value === kind)?.[1] || kind;
    const item = object(id("prop"), kind, 330, 230, label);
    scene.state ||= state(scene.name, []);
    scene.state.objects.push(item);
    selectedObjectId = item.id;
    saveProject(`${label} added to this scene.`);
    render();
  }

  function deleteObject() {
    const scene = selectedScene();
    if (!selectedObjectId || !scene.state) return;
    scene.state.objects = scene.state.objects.filter((item) => item.id !== selectedObjectId);
    selectedObjectId = null;
    saveProject("Prop removed from this scene only.");
    render();
  }

  function addBlankScene() {
    const scene = { id: id("scene"), name: "New laboratory scene", mode: "lab", durationMs: 2500, state: state("New laboratory scene", []) };
    project.scenes.push(scene);
    selectedSceneId = scene.id;
    selectedObjectId = null;
    saveProject("Blank independent laboratory scene added.");
    render();
  }

  function addVideoScene() {
    const scene = { id: id("scene"), name: "Uploaded reaction video", mode: "video", durationMs: 5400, videoSrc: VIDEO_SRC };
    project.scenes.push(scene);
    selectedSceneId = scene.id;
    selectedObjectId = null;
    saveProject("Video scene added.");
    render();
  }

  function exportProject() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "purple-rabbit-stage"}.prstudio`;
    link.click();
    URL.revokeObjectURL(href);
    setStatus("Editable stage project exported.");
  }

  function importProject(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        project = normalizeProject(JSON.parse(String(reader.result)));
        selectedSceneId = project.scenes[0].id;
        selectedObjectId = null;
        saveProject("Editable stage project imported.");
        render();
      } catch {
        setStatus("That file is not a Purple Rabbit stage project.");
      }
    };
    reader.readAsText(file);
  }

  function startPreview(startAt = 0) {
    stopPreview(false);
    preview.classList.add("fa-open");
    previewIndex = Math.max(0, Math.min(project.scenes.length - 1, startAt));
    showPreviewScene();
  }

  function showPreviewScene() {
    window.clearTimeout(previewTimer);
    const scene = project.scenes[previewIndex];
    preview.querySelector(".fa-preview-title").textContent = `${previewIndex + 1}/${project.scenes.length} · ${scene.name}`;
    const host = preview.querySelector(".fa-preview-stage");
    if (scene.mode === "lab") renderLabScene(scene, host, false);
    else renderSpecialScene(scene, host, true);
    const video = host.querySelector("video");
    if (video) video.addEventListener("ended", nextPreview, { once: true });
    else previewTimer = window.setTimeout(nextPreview, scene.durationMs);
  }

  function nextPreview() {
    if (previewIndex >= project.scenes.length - 1) {
      window.clearTimeout(previewTimer);
      return;
    }
    previewIndex += 1;
    showPreviewScene();
  }

  function previousPreview() {
    previewIndex = Math.max(0, previewIndex - 1);
    showPreviewScene();
  }

  function stopPreview(closePreview = true) {
    window.clearTimeout(previewTimer);
    previewTimer = null;
    preview?.querySelector("video")?.pause?.();
    if (closePreview) preview?.classList.remove("fa-open");
  }

  function open() {
    project = readProject();
    selectedSceneId ||= project.scenes[0].id;
    root.classList.add("fa-open");
    root.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    render();
    root.querySelector(".fa-stage-close").focus({ preventScroll: true });
  }

  function close() {
    root.classList.remove("fa-open");
    root.setAttribute("aria-hidden", "true");
    inspector.hidden = false;
    document.documentElement.style.overflow = "";
  }

  function build() {
    installStyle();
    project = readProject();
    selectedSceneId = project.scenes[0].id;

    const launcher = document.createElement("button");
    launcher.className = "fa-stage-launcher";
    launcher.type = "button";
    launcher.textContent = "🎬 Video stage";
    launcher.setAttribute("aria-label", "Open the editable Purple Rabbit video stage");
    document.body.appendChild(launcher);

    root = document.createElement("section");
    root.id = ROOT_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <header class="fa-stage-titlebar">
        <img src="./purple-rabbit-adobe.webp" alt=""><div><span>Purple Rabbit Chemistry</span><h2>Editable video stage</h2></div>
        <input class="fa-stage-project-title" aria-label="Project title" maxlength="100">
        <button class="fa-stage-close" type="button" aria-label="Close video stage">×</button>
      </header>
      <div class="fa-stage-layout">
        <aside class="fa-stage-scenes"><div class="fa-stage-panel-head"><strong>Independent scenes</strong><button class="fa-add-scene" type="button">＋</button></div><div class="fa-stage-scene-list"></div></aside>
        <section class="fa-stage-center">
          <div class="fa-stage-toolbar">
            <button class="fa-preview-project fa-primary" type="button">▶ Preview sequence</button>
            <button class="fa-add-blank" type="button">＋ Lab scene</button>
            <button class="fa-add-video" type="button">＋ Video scene</button>
            <button class="fa-export-project" type="button">Export project</button>
            <button class="fa-import-project" type="button">Import</button>
            <button class="fa-reset-template" type="button">Reset iodine template</button>
            <button class="fa-show-inspector" type="button">Properties</button>
            <input class="fa-import-input" type="file" accept=".prstudio,application/json" hidden>
          </div>
          <div class="fa-stage-canvas-wrap"></div>
        </section>
        <aside class="fa-stage-inspector"></aside>
      </div>
      <footer class="fa-stage-footer" aria-live="polite">Ready · drag props in this scene, or edit it in the full laboratory and capture the result.</footer>
    `;
    document.body.appendChild(root);

    preview = document.createElement("section");
    preview.id = PREVIEW_ID;
    preview.setAttribute("role", "dialog");
    preview.setAttribute("aria-modal", "true");
    preview.innerHTML = `
      <header class="fa-preview-head"><h2 class="fa-preview-title">Preview</h2><button class="fa-preview-stop" type="button">×</button></header>
      <div class="fa-preview-stage"></div>
      <footer class="fa-preview-controls"><button class="fa-preview-previous" type="button">Previous</button><button class="fa-preview-next" type="button">Next</button><button class="fa-preview-full" type="button">Play iodine finale</button></footer>
    `;
    document.body.appendChild(preview);

    stageHost = root.querySelector(".fa-stage-canvas-wrap");
    sceneRail = root.querySelector(".fa-stage-scene-list");
    inspector = root.querySelector(".fa-stage-inspector");
    status = root.querySelector(".fa-stage-footer");

    launcher.addEventListener("click", open);
    root.querySelector(".fa-stage-close").addEventListener("click", close);
    root.querySelector(".fa-stage-project-title").addEventListener("input", (event) => { project.title = event.target.value; saveProject(); });
    root.querySelector(".fa-add-scene").addEventListener("click", addBlankScene);
    root.querySelector(".fa-add-blank").addEventListener("click", addBlankScene);
    root.querySelector(".fa-add-video").addEventListener("click", addVideoScene);
    root.querySelector(".fa-preview-project").addEventListener("click", () => startPreview(0));
    root.querySelector(".fa-export-project").addEventListener("click", exportProject);
    root.querySelector(".fa-import-project").addEventListener("click", () => root.querySelector(".fa-import-input").click());
    root.querySelector(".fa-import-input").addEventListener("change", (event) => { importProject(event.target.files?.[0]); event.target.value = ""; });
    root.querySelector(".fa-reset-template").addEventListener("click", () => {
      if (!window.confirm("Replace this local stage project with the editable iodine template?")) return;
      project = defaultProject();
      selectedSceneId = project.scenes[0].id;
      selectedObjectId = null;
      saveProject("Editable iodine template restored.");
      render();
    });
    root.querySelector(".fa-show-inspector").addEventListener("click", () => { inspector.hidden = false; renderInspector(); });
    preview.querySelector(".fa-preview-stop").addEventListener("click", () => stopPreview(true));
    preview.querySelector(".fa-preview-next").addEventListener("click", nextPreview);
    preview.querySelector(".fa-preview-previous").addEventListener("click", previousPreview);
    preview.querySelector(".fa-preview-full").addEventListener("click", () => window.FuriousAcidIodineStory?.play?.());
    document.addEventListener("pointermove", moveDrag, { passive: false });
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (preview.classList.contains("fa-open")) stopPreview(true);
      else if (root.classList.contains("fa-open")) close();
    });

    window.FuriousAcidStageStudio = {
      STORAGE_KEY,
      LAST_SCENE_KEY,
      open,
      close,
      getProject: () => clone(project),
      setProject: (value) => { project = normalizeProject(value); selectedSceneId = project.scenes[0].id; selectedObjectId = null; saveProject(); if (root.classList.contains("fa-open")) render(); },
      captureCurrent,
      selectScene: (sceneId) => { selectedSceneId = sceneId; selectedObjectId = null; if (root.classList.contains("fa-open")) render(); },
      moveObject: (sceneId, objectId, x, y) => {
        const scene = project.scenes.find((item) => item.id === sceneId);
        const item = scene?.state?.objects?.find((candidate) => candidate.id === objectId);
        if (!item) return false;
        item.x = Math.max(0, Math.min(STAGE_WIDTH - 92, Number(x) || 0));
        item.y = Math.max(0, Math.min(STAGE_HEIGHT - 105, Number(y) || 0));
        saveProject();
        return true;
      },
      loadSceneIntoLab: (sceneId, options = {}) => {
        const scene = project.scenes.find((item) => item.id === sceneId);
        return scene ? loadSceneIntoLab(scene, options) : false;
      },
      resetIodine: () => { project = defaultProject(); selectedSceneId = project.scenes[0].id; saveProject(); return clone(project); },
      preview: startPreview
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build, { once: true });
  else build();
})();
