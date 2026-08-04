import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../purple/index.html", import.meta.url), "utf8");

function chemicalLibrary() {
  const marker = "var te=";
  const start = html.indexOf(marker);
  const end = html.indexOf("],ne=[", start);
  assert.ok(start >= 0 && end > start, "Expected bundled Purple chemical library");
  const source = html.slice(start + marker.length, end + 1);
  const C = (id, name, formula, category, molarMass, color) => ({ id, name, formula, category, unit: "mmol", molarMass, color });
  return Function("C", `return (${source});`)(C);
}

test("Purple includes a Crocodile-scale categorized chemical library", () => {
  const chemicals = chemicalLibrary();
  const ids = new Set(chemicals.map((chemical) => chemical.id));
  const categories = new Set(chemicals.map((chemical) => chemical.category));
  assert.equal(ids.size, chemicals.length, "Chemical ids must remain unique");
  assert.ok(chemicals.length >= 120, `Expected at least 120 chemicals, found ${chemicals.length}`);
  for (const category of ["Acids", "Alkalis", "Oxides", "Halides", "Sulfides", "Carbonates", "Nitrates", "Sulfates", "Gases", "Indicators", "Metals"]) {
    assert.ok(categories.has(category), `Missing ${category} category`);
  }
  for (const id of ["hcl", "naoh", "copper-ii-oxide", "ammonium-chloride", "gas-carbon-dioxide", "magnesium-sulfate"]) {
    assert.ok(ids.has(id), `Missing ${id}`);
  }
});

test("the editable stage and beta access layers are loaded by the Purple page", () => {
  assert.match(html, /<script src="\.\/stage-studio\.js" defer><\/script>/);
  assert.match(html, /<script src="\.\/beta-access\.js" defer><\/script>/);
});
