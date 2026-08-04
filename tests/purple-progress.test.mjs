import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const progress = JSON.parse(await readFile(new URL("../purple-progress.json", import.meta.url), "utf8"));
const html = await readFile(new URL("../purple-progress.html", import.meta.url), "utf8");

test("the full moon represents the verified public-beta scope", () => {
  assert.equal(progress.completion, 100);
  assert.equal(progress.remaining, 0);
  assert.equal(progress.scale, "Purple Rabbit Public Beta Readiness");
  assert.match(progress.target, /Phone laboratory \+ editable video stage/);
  assert.match(html, /--progress: 100/);
  assert.match(html, /aria-valuenow="100"/);
  assert.match(html, /public beta is ready/i);
});
