import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

const studioSource = await readFile(new URL("../purple/stage-studio.js", import.meta.url), "utf8");

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

async function createStudio() {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div><header class="window-titlebar"></header><input type="file" accept=".prc,.json,application/json"></body></html>', {
    pretendToBeVisual: true,
    runScripts: "outside-only",
    url: "https://furiousacid.com/purple/"
  });
  const { window } = dom;
  window.confirm = () => true;
  window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(window.performance.now()), 0);
  window.cancelAnimationFrame = (timer) => window.clearTimeout(timer);
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
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
  window.HTMLElement.prototype.setPointerCapture = function setPointerCapture(pointerId) { this.__pointerCapture = pointerId; };
  window.HTMLElement.prototype.releasePointerCapture = function releasePointerCapture(pointerId) { if (this.__pointerCapture === pointerId) this.__pointerCapture = null; };
  window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    if (this.classList.contains("fa-stage-canvas")) return { left: 0, top: 0, width: 760, height: 540, right: 760, bottom: 540 };
    return { left: 0, top: 0, width: 100, height: 40, right: 100, bottom: 40 };
  };
  window.eval(studioSource);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
  await new Promise((resolve) => window.setTimeout(resolve, 20));
  return dom;
}

test("iodine project is an editable six-scene sequence with the exact video second-to-last", async (t) => {
  const dom = await createStudio();
  t.after(() => dom.window.close());
  const { window } = dom;
  const studio = window.FuriousAcidStageStudio;
  assert.ok(studio);

  const project = studio.getProject();
  assert.equal(project.scenes.length, 6);
  assert.equal(project.scenes.at(-2).mode, "video");
  assert.equal(project.scenes.at(-2).videoSrc, "./assets/iodine-pre-sublimation-app.mp4");
  assert.equal(project.scenes.at(-1).mode, "sublimation");
  assert.ok(project.scenes.slice(0, 4).every((scene) => scene.mode === "lab" && Array.isArray(scene.state.objects)));

  studio.open();
  assert.equal(window.document.querySelectorAll(".fa-stage-scene-card").length, 6);
  assert.ok(window.document.querySelector(".fa-stage-canvas .fa-stage-object"));
});

test("dragging and duplicating edit only the selected independent scene", async (t) => {
  const dom = await createStudio();
  t.after(() => dom.window.close());
  const { window } = dom;
  const studio = window.FuriousAcidStageStudio;
  studio.open();

  const before = studio.getProject();
  const firstScene = before.scenes[0];
  const secondSceneBefore = JSON.stringify(before.scenes[1].state.objects);
  const firstObject = window.document.querySelector(".fa-stage-canvas .fa-stage-object");
  const original = firstScene.state.objects.find((item) => item.id === firstObject.dataset.objectId);

  firstObject.dispatchEvent(pointer(window, "pointerdown", { clientX: original.x + 10, clientY: original.y + 10 }));
  window.document.dispatchEvent(pointer(window, "pointermove", { clientX: original.x + 110, clientY: original.y + 70 }));
  window.document.dispatchEvent(pointer(window, "pointerup", { clientX: original.x + 110, clientY: original.y + 70 }));

  const moved = studio.getProject();
  const movedObject = moved.scenes[0].state.objects.find((item) => item.id === original.id);
  assert.ok(movedObject.x > original.x + 80);
  assert.ok(movedObject.y > original.y + 40);
  assert.equal(JSON.stringify(moved.scenes[1].state.objects), secondSceneBefore);

  window.document.querySelector(".fa-duplicate-scene").click();
  const duplicated = studio.getProject();
  assert.equal(duplicated.scenes.length, 7);
  assert.notEqual(duplicated.scenes[0].id, duplicated.scenes[1].id);
  assert.notEqual(duplicated.scenes[0].state.objects[0].id, duplicated.scenes[1].state.objects[0].id);
});

test("current live laboratory can be captured and loaded back without changing other stages", async (t) => {
  const dom = await createStudio();
  t.after(() => dom.window.close());
  const { window } = dom;
  const studio = window.FuriousAcidStageStudio;
  const projectBefore = studio.getProject();
  const secondSceneBefore = JSON.stringify(projectBefore.scenes[1]);
  const captured = {
    version: 1,
    name: "Phone capture",
    clock: 12,
    objects: [{ id: "phone-flask", kind: "flask", x: 420, y: 210, label: "Phone flask", contents: { water: 30, hcl: 5 }, capacity: 250, temperature: 21, heating: false }]
  };
  const save = window.document.createElement("button");
  save.title = "Save scene";
  save.addEventListener("click", () => {
    const blob = new window.Blob([JSON.stringify(captured)], { type: "application/json" });
    const link = window.document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "phone-capture.prc";
    link.click();
    window.URL.revokeObjectURL(link.href);
  });
  window.document.body.appendChild(save);
  await studio.captureCurrent();

  const afterCapture = studio.getProject();
  assert.equal(JSON.stringify(afterCapture.scenes[0].state), JSON.stringify(captured));
  assert.equal(JSON.stringify(afterCapture.scenes[1]), secondSceneBefore);

  let loadedEvent = null;
  window.addEventListener("fa:stage-load-lab", (event) => { loadedEvent = event.detail; }, { once: true });
  assert.equal(studio.loadSceneIntoLab(afterCapture.scenes[0].id, { reload: false }), true);
  assert.equal(JSON.stringify(JSON.parse(window.localStorage.getItem(studio.LAST_SCENE_KEY))), JSON.stringify(captured));
  assert.equal(JSON.stringify(loadedEvent), JSON.stringify(captured));
});

test("imported stage data is bounded and cannot inject markup through scene identifiers", async (t) => {
  const dom = await createStudio();
  t.after(() => dom.window.close());
  const { window } = dom;
  const studio = window.FuriousAcidStageStudio;
  studio.setProject({
    version: 1,
    title: "Imported project",
    scenes: [{
      id: 'bad\" onclick=\"window.__stageInjected=true',
      name: "Imported scene",
      mode: "lab",
      durationMs: Infinity,
      state: {
        version: 1,
        objects: [{ id: "<unsafe>", kind: "unknown", x: -900, y: 9000, label: "Imported prop", contents: { water: 12, "<bad>": 100 } }]
      }
    }]
  });
  studio.open();

  const imported = studio.getProject();
  assert.match(imported.scenes[0].id, /^[a-z0-9._:-]+$/i);
  assert.equal(imported.scenes[0].durationMs, 2500);
  assert.equal(imported.scenes[0].state.objects[0].kind, "beaker");
  assert.equal(imported.scenes[0].state.objects[0].x, 0);
  assert.equal(imported.scenes[0].state.objects[0].y, 435);
  assert.deepEqual(Object.keys(imported.scenes[0].state.objects[0].contents), ["water"]);
  assert.equal(window.__stageInjected, undefined);
  assert.equal(studio.loadSceneIntoLab("missing-scene", { reload: false }), false);
});
