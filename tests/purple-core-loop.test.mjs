import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

const htmlPath = new URL("../purple/index.html", import.meta.url);
const coreLoopPath = new URL("../purple/core-loop.js", import.meta.url);
const stageStudioPath = new URL("../purple/stage-studio.js", import.meta.url);

function rect(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() { return this; } };
}

async function flush(window, delay = 30) {
  await new Promise((resolve) => window.setTimeout(resolve, delay));
}

async function waitFor(window, predicate, timeout = 1500) {
  const started = window.performance.now();
  while (window.performance.now() - started < timeout) {
    const value = predicate();
    if (value) return value;
    await flush(window, 25);
  }
  return null;
}

function pointer(window, type, init) {
  return new window.PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? "touch",
    isPrimary: true,
    clientX: init.clientX,
    clientY: init.clientY,
    button: 0
  });
}

function clickByText(window, selector, text) {
  const element = Array.from(window.document.querySelectorAll(selector)).find((candidate) => candidate.textContent.trim() === text);
  assert.ok(element, `Expected ${selector} with text ${text}`);
  element.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  return element;
}

async function createApp() {
  const html = await readFile(htmlPath, "utf8");
  const bundleStart = html.indexOf('<script type="module">') + '<script type="module">'.length;
  const bundleEnd = html.indexOf("</script>", bundleStart);
  const bundle = html.slice(bundleStart, bundleEnd);
  const coreLoop = await readFile(coreLoopPath, "utf8");
  const dom = new JSDOM("<!doctype html><html><head></head><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
    runScripts: "outside-only",
    url: "https://furiousacid.com/purple/"
  });
  const { window } = dom;

  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
  window.matchMedia = (query) => ({
    matches: /max-width:\s*720px|max-width:\s*760px|pointer:\s*coarse/.test(query),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return true; }
  });
  window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(window.performance.now()), 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);

  class TestPointerEvent extends window.MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      Object.defineProperties(this, {
        pointerId: { value: init.pointerId ?? 1 },
        pointerType: { value: init.pointerType ?? "touch" },
        isPrimary: { value: init.isPrimary ?? true }
      });
    }
  }
  window.PointerEvent = TestPointerEvent;

  window.HTMLElement.prototype.setPointerCapture = function setPointerCapture(pointerId) {
    this.__pointerCapture = pointerId;
  };
  window.HTMLElement.prototype.hasPointerCapture = function hasPointerCapture(pointerId) {
    return this.__pointerCapture === pointerId;
  };
  window.HTMLElement.prototype.releasePointerCapture = function releasePointerCapture(pointerId) {
    if (this.__pointerCapture === pointerId) this.__pointerCapture = null;
  };
  window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    if (this.classList.contains("workbench")) return rect(0, 0, 390, 540);
    if (this.classList.contains("lab-object")) {
      const left = (Number.parseFloat(this.style.left) / 100) * 390;
      const top = (Number.parseFloat(this.style.top) / 100) * 540;
      return rect(left, top, 94, 102);
    }
    if (this.classList.contains("part-row")) return rect(8, 120, 280, 44);
    return rect(0, 0, 100, 40);
  };

  window.localStorage.setItem("purple-rabbit-phone-tutorial-v1", "complete");
  window.sessionStorage.setItem("purple-rabbit-intro-v1", "complete");
  window.eval(bundle);
  window.eval(coreLoop);
  await flush(window, 60);
  return dom;
}

test("one-finger bottle drop updates liquid, quantity, and pH immediately", async (t) => {
  const dom = await createApp();
  t.after(() => dom.window.close());
  const { window } = dom;
  const bottle = window.document.querySelector('[data-object-id="blank-hcl"]');
  const beaker = window.document.querySelector('[data-object-id="blank-beaker"]');
  assert.ok(bottle && beaker);

  const bottleRect = bottle.getBoundingClientRect();
  const beakerRect = beaker.getBoundingClientRect();
  bottle.dispatchEvent(pointer(window, "pointerdown", { clientX: bottleRect.left + 20, clientY: bottleRect.top + 20 }));
  bottle.dispatchEvent(pointer(window, "pointermove", { clientX: beakerRect.left + 45, clientY: beakerRect.top + 45 }));
  bottle.dispatchEvent(pointer(window, "pointerup", { clientX: beakerRect.left + 45, clientY: beakerRect.top + 45 }));
  await flush(window);

  const updated = window.document.querySelector('[data-object-id="blank-beaker"]');
  assert.equal(updated.dataset.volume, "60.0");
  assert.match(updated.querySelector(".object-reading").textContent, /60\.0 cm³ · pH 0\.8/);
  assert.ok(Number.parseFloat(updated.querySelector(".liquid").style.height) > 16);
});

test("part drag places apparatus, then chemical drag adds its selected dose", async (t) => {
  const dom = await createApp();
  t.after(() => dom.window.close());
  const { window } = dom;

  clickByText(window, ".scene-ribbon button", "＋ Part");
  const flaskRow = await waitFor(window, () => Array.from(window.document.querySelectorAll(".parts-tree .part-row"))
    .find((row) => row.textContent.includes("Conical flask")));
  assert.ok(flaskRow);
  flaskRow.dispatchEvent(pointer(window, "pointerdown", { pointerId: 2, clientX: 30, clientY: 180 }));
  flaskRow.dispatchEvent(pointer(window, "pointermove", { pointerId: 2, clientX: 310, clientY: 220 }));
  flaskRow.dispatchEvent(pointer(window, "pointerup", { pointerId: 2, clientX: 310, clientY: 220 }));
  await flush(window, 50);

  const flasks = window.document.querySelectorAll(".lab-object.kind-flask");
  assert.equal(flasks.length, 2);
  const placedFlask = flasks[1];
  assert.equal(placedFlask.dataset.volume, "0.0");

  await flush(window, 700);
  clickByText(window, ".scene-ribbon button", "＋ Part");
  await flush(window);
  const acidRow = Array.from(window.document.querySelectorAll(".parts-tree .part-row"))
    .find((row) => row.textContent.includes("Hydrochloric acid"));
  assert.ok(acidRow);
  const flaskRect = placedFlask.getBoundingClientRect();
  acidRow.dispatchEvent(pointer(window, "pointerdown", { pointerId: 3, clientX: 30, clientY: 180 }));
  acidRow.dispatchEvent(pointer(window, "pointermove", { pointerId: 3, clientX: flaskRect.left + 45, clientY: flaskRect.top + 45 }));
  acidRow.dispatchEvent(pointer(window, "pointerup", { pointerId: 3, clientX: flaskRect.left + 45, clientY: flaskRect.top + 45 }));
  await flush(window, 50);

  const updatedFlask = window.document.querySelectorAll(".lab-object.kind-flask")[1];
  assert.equal(updatedFlask.dataset.volume, "10.0");
  assert.match(updatedFlask.querySelector(".object-reading").textContent, /10\.0 cm³ · pH 0\.0/);
});

test("an added Crocodile-style library chemical participates in the live vessel engine", async (t) => {
  const dom = await createApp();
  t.after(() => dom.window.close());
  const { window } = dom;

  clickByText(window, ".scene-ribbon button", "＋ Part");
  const acidRow = await waitFor(window, () => Array.from(window.document.querySelectorAll(".parts-tree .part-row"))
    .find((row) => row.textContent.includes("Phosphoric acid")));
  assert.ok(acidRow);
  const flask = window.document.querySelector('[data-object-id="blank-flask"]');
  const flaskRect = flask.getBoundingClientRect();
  acidRow.dispatchEvent(pointer(window, "pointerdown", { pointerId: 7, clientX: 30, clientY: 180 }));
  acidRow.dispatchEvent(pointer(window, "pointermove", { pointerId: 7, clientX: flaskRect.left + 45, clientY: flaskRect.top + 45 }));
  acidRow.dispatchEvent(pointer(window, "pointerup", { pointerId: 7, clientX: flaskRect.left + 45, clientY: flaskRect.top + 45 }));
  await flush(window, 60);

  const updated = window.document.querySelector('[data-object-id="blank-flask"]');
  assert.equal(updated.dataset.volume, "10.0");
  assert.match(updated.querySelector(".object-reading").textContent, /10\.0 cm³ · pH 0\.0/);
});

test("the video stage captures and reloads exact live chemical state through the simulator save/open bridge", async (t) => {
  const dom = await createApp();
  t.after(() => dom.window.close());
  const { window } = dom;

  const bottle = window.document.querySelector('[data-object-id="blank-hcl"]');
  const beaker = window.document.querySelector('[data-object-id="blank-beaker"]');
  const bottleRect = bottle.getBoundingClientRect();
  const beakerRect = beaker.getBoundingClientRect();
  bottle.dispatchEvent(pointer(window, "pointerdown", { clientX: bottleRect.left + 20, clientY: bottleRect.top + 20 }));
  bottle.dispatchEvent(pointer(window, "pointermove", { clientX: beakerRect.left + 45, clientY: beakerRect.top + 45 }));
  bottle.dispatchEvent(pointer(window, "pointerup", { clientX: beakerRect.left + 45, clientY: beakerRect.top + 45 }));
  await flush(window, 40);

  window.eval(await readFile(stageStudioPath, "utf8"));
  await flush(window, 20);
  const studio = window.FuriousAcidStageStudio;
  assert.ok(studio);
  await studio.captureCurrent();

  const project = studio.getProject();
  const capturedBeaker = project.scenes[0].state.objects.find((item) => item.id === "blank-beaker");
  assert.equal(JSON.stringify(capturedBeaker.contents), JSON.stringify({ water: 50, hcl: 10 }));
  capturedBeaker.contents.hcl = 20;
  studio.setProject(project);
  assert.equal(studio.loadSceneIntoLab(project.scenes[0].id, { reload: false }), true);

  const reloaded = await waitFor(window, () => {
    const element = window.document.querySelector('[data-object-id="blank-beaker"]');
    return element?.dataset.volume === "70.0" ? element : null;
  });
  assert.ok(reloaded);
  assert.match(reloaded.querySelector(".object-reading").textContent, /70\.0 cm³ · pH 0\.5/);
});
