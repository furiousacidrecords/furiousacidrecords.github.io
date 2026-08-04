import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../purple/index.html", import.meta.url);
let html = await readFile(path, "utf8");

const oldPointerStart = "function Lt(e,t){let n=e.pointerType===`mouse`&&e.button===0&&t.kind===`bottle`,r=e.pointerType!==`mouse`&&u===t.id;!n&&!r||(r&&e.preventDefault(),a(t.id),$e.current={id:t.id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,originX:t.x,originY:t.y,moved:!1,pointerType:e.pointerType},e.currentTarget.setPointerCapture(e.pointerId))}";
const newPointerStart = "function Lt(e,t){let n=e.pointerType===`mouse`?e.button===0:e.isPrimary!==!1;n&&(e.pointerType!==`mouse`&&e.preventDefault(),a(t.id),$e.current={id:t.id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,originX:t.x,originY:t.y,moved:!1,pointerType:e.pointerType},e.currentTarget.setPointerCapture(e.pointerId))}";

if (html.includes(oldPointerStart)) {
  html = html.replace(oldPointerStart, newPointerStart);
} else if (!html.includes(newPointerStart)) {
  throw new Error("Purple pointer handler did not match the expected app bundle.");
}

const scriptTag = '    <script src="./core-loop.js" defer></script>\n';
if (!html.includes(scriptTag.trim())) {
  const anchor = /^[ \t]*<script src="\.\/lab-principles\.js" defer><\/script>[ \t]*$/m;
  if (!anchor.test(html)) throw new Error("Could not find the Purple script insertion point.");
  html = html.replace(anchor, `${scriptTag.trimEnd()}\n    <script src="./lab-principles.js" defer></script>`);
}

await writeFile(path, html);
