import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

const accessSource = await readFile(new URL("../purple/beta-access.js", import.meta.url), "utf8");

async function createAccess() {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div><header class="window-titlebar"></header></body></html>', {
    pretendToBeVisual: true,
    runScripts: "outside-only",
    url: "https://furiousacid.com/purple/"
  });
  dom.window.confirm = () => true;
  dom.window.eval(accessSource);
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded", { bubbles: true }));
  await new Promise((resolve) => dom.window.setTimeout(resolve, 10));
  return dom;
}

test("beta is sign-up-only, validates email, and unlocks without collecting a password", async (t) => {
  const dom = await createAccess();
  t.after(() => dom.window.close());
  const { window } = dom;
  const access = window.FuriousAcidBetaAccess;
  const form = window.document.querySelector(".fa-beta-form");
  assert.ok(access && form);
  assert.equal(window.document.documentElement.dataset.betaAccess, "locked");
  assert.equal(window.document.getElementById("root").inert, true);
  assert.equal(form.querySelectorAll('input[type="password"]').length, 0);

  form.elements.name.value = "Furious";
  form.elements.email.value = "not-an-email";
  form.elements.consent.checked = true;
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  assert.match(window.document.querySelector(".fa-beta-error").textContent, /valid email/i);
  assert.equal(access.read(), null);

  form.elements.email.value = "furious@example.com";
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  assert.equal(window.document.documentElement.dataset.betaAccess, "ready");
  assert.equal(window.document.getElementById("root").inert, false);
  assert.equal(access.read().name, "Furious");
  assert.equal(access.read().email, "furious@example.com");
  assert.equal(access.read().mode, "browser");
});
