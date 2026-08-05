import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

const source = await readFile(new URL("../purple/molecule-draw.js", import.meta.url), "utf8");

class MockEditor {
  constructor(id, width, height, options) {
    this.id = id;
    this.width = width;
    this.height = height;
    this.options = options;
    this.value = "";
    this.callbacks = new Map();
  }

  smiles() { return this.value; }
  readGenericMolecularInput(value) { this.value = String(value).trim(); }
  reset() { this.value = ""; }
  setCallBack(name, callback) { this.callbacks.set(name, callback); }
  setSize(width, height) { this.width = width; this.height = height; }
}

async function createWindow(fetchImpl = async () => ({
  ok: true,
  status: 200,
  async json() {
    return {
      PropertyTable: {
        Properties: [{
          CID: 702,
          Title: "Ethanol",
          IUPACName: "ethanol",
          MolecularFormula: "C2H6O",
          MolecularWeight: "46.07",
          SMILES: "CCO",
          ConnectivitySMILES: "CCO",
          InChIKey: "LFQSCWFLJHTTHZ-UHFFFAOYSA-N"
        }]
      }
    };
  }
})) {
  const dom = new JSDOM("<!doctype html><html><head></head><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
    runScripts: "outside-only",
    url: "https://furiousacid.com/purple/"
  });
  const { window } = dom;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
  window.fetch = fetchImpl;
  window.JSApplet = { JSME: MockEditor };
  window.navigator.clipboard = { writeText: async () => {} };
  window.eval(source);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
  await new Promise((resolve) => window.setTimeout(resolve, 5));
  return dom;
}

test("adds a phone-friendly molecule launcher and opens the drawing window", async (t) => {
  const dom = await createWindow();
  t.after(() => dom.window.close());
  const { window } = dom;
  const launcher = window.document.querySelector(".fa-molecule-launcher");
  assert.ok(launcher);
  launcher.click();
  await new Promise((resolve) => window.setTimeout(resolve, 5));

  assert.ok(window.document.querySelector("#fa-molecule-draw").classList.contains("fa-open"));
  assert.equal(window.document.querySelector('[data-panel="draw"]').hidden, false);
  assert.equal(window.document.querySelector('[data-panel="result"]').hidden, true);
  assert.ok(window.FuriousAcidMoleculeDraw);
});

test("loads a SMILES structure, identifies it, and renders the IUPAC result", async (t) => {
  let request = null;
  const dom = await createWindow(async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          PropertyTable: {
            Properties: [{
              CID: 702,
              Title: "Ethanol",
              IUPACName: "ethanol",
              MolecularFormula: "C2H6O",
              MolecularWeight: "46.07",
              SMILES: "CCO",
              InChIKey: "LFQSCWFLJHTTHZ-UHFFFAOYSA-N"
            }]
          }
        };
      }
    };
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  const api = window.FuriousAcidMoleculeDraw;
  api.open();
  await api.loadSmiles("CCO");
  const result = await api.identify();

  assert.equal(result.iupacName, "ethanol");
  assert.equal(window.document.querySelector(".fa-iupac-name").textContent, "ethanol");
  assert.equal(window.document.querySelector(".fa-result-formula").textContent, "C2H6O");
  assert.equal(window.document.querySelector('[data-panel="result"]').hidden, false);
  assert.match(request.url, /pubchem\.ncbi\.nlm\.nih\.gov/);
  assert.equal(request.options.method, "POST");
  assert.equal(new URLSearchParams(request.options.body).get("smiles"), "CCO");
});

test("keeps the drawing and SMILES available when no exact PubChem match exists", async (t) => {
  const dom = await createWindow(async () => ({ ok: false, status: 404 }));
  t.after(() => dom.window.close());
  const { window } = dom;
  const api = window.FuriousAcidMoleculeDraw;
  api.open();
  await api.loadSmiles("C1CC1N");
  const result = await api.identify();

  assert.equal(result, null);
  assert.equal(window.document.querySelector(".fa-result-smiles").textContent, "C1CC1N");
  assert.match(window.document.querySelector(".fa-result-status").textContent, /No exact PubChem record/);
  assert.equal(window.document.querySelector(".fa-copy-smiles").disabled, false);
});

test("normalizes legacy and current PubChem SMILES property names", async (t) => {
  const dom = await createWindow();
  t.after(() => dom.window.close());
  const result = await dom.window.FuriousAcidMoleculeDraw.lookupPubChem("CCO", async () => ({
    ok: true,
    status: 200,
    async json() {
      return { PropertyTable: { Properties: [{ IUPACName: "ethanol", CanonicalSMILES: "CCO" }] } };
    }
  }));
  assert.equal(result.smiles, "CCO");
  assert.equal(result.iupacName, "ethanol");
});
