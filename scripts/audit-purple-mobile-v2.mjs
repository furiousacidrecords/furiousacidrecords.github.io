import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("audit-output");
await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const findings = [];
const steps = [];
const add = (severity, area, message, detail = "") => findings.push({ severity, area, message, detail });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

await page.addInitScript(() => {
  localStorage.setItem("purple-rabbit-beta-access-v1", JSON.stringify({
    version: 1,
    name: "Mobile Play Tester",
    email: "mobile-audit@example.com",
    createdAt: new Date().toISOString(),
    mode: "browser"
  }));
});

page.on("pageerror", error => add("critical", "runtime", "Uncaught page error", error.message));
page.on("console", message => { if (message.type() === "error") add("high", "console", "Browser console error", message.text()); });
page.on("requestfailed", request => {
  const detail = `${request.method()} ${request.url()} — ${request.failure()?.errorText || "unknown"}`;
  if (!/\.mp4/i.test(request.url()) || !/ERR_ABORTED/i.test(detail)) add("high", "network", "Resource failed to load", detail);
});

async function screenshot(name, health, note) {
  const filename = `${String(steps.length + 1).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: true });
  steps.push({ step: steps.length + 1, name, health, note, screenshot: filename });
}

async function touchDrag(locator, targetX, targetY) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (!box) return false;
  const sx = Math.round(box.x + box.width / 2);
  const sy = Math.round(box.y + box.height / 2);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: sx, y: sy, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
  for (let i = 1; i <= 16; i += 1) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: Math.round(sx + (targetX - sx) * i / 16), y: Math.round(sy + (targetY - sy) * i / 16), id: 1, radiusX: 4, radiusY: 4, force: 1 }]
    });
    await page.waitForTimeout(20);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(900);
  return true;
}

const url = process.env.PURPLE_AUDIT_URL || "http://127.0.0.1:4173/purple/";
try {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (!response?.ok()) add("critical", "launch", "Simulator failed to load", `HTTP ${response?.status() ?? "none"}`);
  await page.waitForTimeout(2200);
  await page.keyboard.press("Escape").catch(() => {});
  await screenshot("lab-open", "loaded", "Opened the actual simulator with a saved browser pass.");

  const bench = page.locator(".workbench").first();
  if (!(await bench.isVisible().catch(() => false))) add("critical", "workbench", "Workbench is not visible", "The main play surface could not be reached.");

  const plusPart = page.getByRole("button", { name: /^\+\s*part$/i }).first();
  if (await plusPart.isVisible().catch(() => false)) await plusPart.click();
  else {
    const view = page.getByRole("button", { name: /^view$/i }).first();
    if (await view.isVisible().catch(() => false)) {
      await view.click();
      await page.getByText(/show parts library/i).first().click().catch(() => {});
    }
  }
  await page.waitForTimeout(700);
  const panel = page.locator(".fa-parts-panel").first();
  const panelOpen = await panel.isVisible().catch(() => false);
  if (!panelOpen) add("critical", "parts library", "Parts Library did not open");
  if (panelOpen) {
    const pb = await panel.boundingBox();
    const bb = await bench.boundingBox();
    if (pb && bb && (pb.width > 360 || pb.height > bb.height * 0.7)) {
      add("critical", "parts library", "Parts Library covers the phone workbench", "The list and its drop target cannot be used together on a 390px screen.");
    }
  }
  await screenshot("parts-panel", panelOpen ? "blocks bench" : "broken", "Opened Parts Library and checked whether drag-to-bench remains possible.");

  let panelClosed = !panelOpen;
  if (panelOpen) {
    const pb = await panel.boundingBox();
    if (pb) await page.touchscreen.tap(Math.round(pb.x + pb.width - 24), Math.round(pb.y + 22));
    await page.waitForTimeout(600);
    panelClosed = !(await panel.isVisible().catch(() => false));
    if (!panelClosed) {
      const exactX = panel.getByText("×", { exact: true }).first();
      if (await exactX.isVisible().catch(() => false)) await exactX.click().catch(() => {});
      await page.waitForTimeout(500);
      panelClosed = !(await panel.isVisible().catch(() => false));
    }
    if (!panelClosed) {
      const view = page.getByRole("button", { name: /^view$/i }).first();
      if (await view.isVisible().catch(() => false)) {
        await view.click();
        await page.getByText(/hide parts library/i).first().click().catch(() => {});
      }
      await page.waitForTimeout(500);
      panelClosed = !(await panel.isVisible().catch(() => false));
    }
  }
  if (!panelClosed) add("critical", "parts library", "Parts Library could not be closed reliably", "It continued blocking the lab after the close control and View menu were used.");
  await screenshot("panel-closed", panelClosed ? "closed" : "still blocking", "Closed the library before testing the lab controls.");

  const beaker = page.locator(".workbench .lab-object.kind-beaker").first();
  let beakerMoved = false;
  if (panelClosed && await beaker.isVisible().catch(() => false)) {
    const before = await beaker.boundingBox();
    if (before) {
      await touchDrag(beaker, Math.min(350, before.x + before.width / 2 + 55), Math.min(700, before.y + before.height / 2 + 35));
      const after = await beaker.boundingBox();
      beakerMoved = !!after && (Math.abs(after.x - before.x) > 6 || Math.abs(after.y - before.y) > 6);
      if (!beakerMoved) add("critical", "touch dragging", "One-finger beaker drag did nothing", `Before ${JSON.stringify(before)}, after ${JSON.stringify(after)}`);
    }
  } else add("critical", "touch dragging", "Beaker was not reachable after closing the panel");
  await screenshot("drag-beaker", beakerMoved ? "working" : "broken", "Dragged an existing vessel with touch input.");

  const bottle = page.locator(".workbench .lab-object.kind-bottle").first();
  let transferWorked = false;
  if (panelClosed && await bottle.isVisible().catch(() => false) && await beaker.isVisible().catch(() => false)) {
    const target = await beaker.boundingBox();
    const before = await beaker.innerText().catch(() => "");
    if (target) {
      await touchDrag(bottle, Math.round(target.x + target.width / 2), Math.round(target.y + target.height / 2));
      const after = await beaker.innerText().catch(() => "");
      transferWorked = before !== after;
      if (!transferWorked) add("critical", "chemical transfer", "Bottle-to-beaker drop did nothing", `Beaker still reads: ${after}`);
    }
  } else add("critical", "chemical transfer", "Bottle or beaker was not reachable");
  await screenshot("chemical-transfer", transferWorked ? "working" : "broken", "Dropped the acid bottle onto the beaker and checked quantity/pH text.");

  const range = page.locator('input[type="range"]').first();
  let doseWorked = false;
  if (await range.isVisible().catch(() => false)) {
    const before = Number(await range.inputValue());
    await range.evaluate((element, value) => {
      element.value = String(value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, before + 10);
    await page.waitForTimeout(300);
    doseWorked = Number(await range.inputValue()) !== before;
  }
  if (!doseWorked) add("high", "dose", "Dose control did not update");
  await screenshot("dose", doseWorked ? "working" : "broken", "Changed the real-time dose value.");

  const pause = page.getByRole("button", { name: /^pause$/i }).first();
  let pauseWorked = false;
  if (await pause.isVisible().catch(() => false)) {
    const beforeText = (await pause.innerText()).trim();
    const beforePressed = await pause.getAttribute("aria-pressed");
    await pause.click();
    await page.waitForTimeout(350);
    const afterText = (await pause.innerText()).trim();
    const afterPressed = await pause.getAttribute("aria-pressed");
    pauseWorked = beforeText !== afterText || beforePressed !== afterPressed;
    if (!pauseWorked) add("high", "pause/play", "Pause gives no visible state change", `Text remained ${afterText}; aria-pressed remained ${afterPressed}`);
  } else add("high", "pause/play", "Pause control was not reachable");
  await screenshot("pause", pauseWorked ? "working" : "unclear", "Pressed Pause and checked for a state change.");

  const blank = page.getByText(/blank laboratory/i).first();
  const titration = page.getByText(/titration/i).first();
  let sceneWorked = false;
  if (await blank.isVisible().catch(() => false) && await titration.isVisible().catch(() => false)) {
    const before = await page.locator(".workbench .lab-object").count();
    await blank.click();
    await page.waitForTimeout(650);
    const blankCount = await page.locator(".workbench .lab-object").count();
    await titration.click();
    await page.waitForTimeout(650);
    const restored = await page.locator(".workbench .lab-object").count();
    sceneWorked = before !== blankCount || blankCount !== restored;
    if (!sceneWorked) add("high", "scenes", "Scene tabs did not change the workbench", `${before} → ${blankCount} → ${restored} objects`);
  } else add("high", "scenes", "Blank laboratory or Titration tab was not reachable");
  await screenshot("scenes", sceneWorked ? "working" : "broken", "Switched to a blank scene and back.");

  const smallTargets = await page.evaluate(() => Array.from(document.querySelectorAll("button, [role='button'], input, a"))
    .map(element => ({ element, rect: element.getBoundingClientRect(), style: getComputedStyle(element) }))
    .filter(item => item.rect.width > 2 && item.rect.height > 2 && item.style.display !== "none" && item.style.visibility !== "hidden")
    .map(item => ({ label: (item.element.getAttribute("aria-label") || item.element.textContent || item.element.tagName).trim().slice(0, 60), width: Math.round(item.rect.width), height: Math.round(item.rect.height) }))
    .filter(item => item.width < 44 || item.height < 44));
  if (smallTargets.length) add("medium", "touch targets", `${smallTargets.length} visible controls are smaller than 44×44px`, JSON.stringify(smallTargets.slice(0, 20)));

  const critical = findings.some(f => f.severity === "critical");
  const report = { testedUrl: url, viewport: "390×844 touch screen", verdict: critical ? "DO NOT DEPLOY" : findings.length ? "FIX BEFORE RELEASE" : "CORE FLOW PASSED", steps, findings };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const markdown = [
    "# Purple Rabbit mobile play audit",
    "",
    `**Verdict:** ${report.verdict}`,
    "",
    "## Steps",
    ...steps.map(step => `${step.step}. **${step.name} — ${step.health}**: ${step.note} (${step.screenshot})`),
    "",
    "## Findings",
    ...(findings.length ? findings.map((finding, index) => `${index + 1}. **${finding.severity.toUpperCase()} — ${finding.area}:** ${finding.message}${finding.detail ? ` — ${finding.detail}` : ""}`) : ["No failures recorded."])
  ].join("\n");
  await fs.writeFile(path.join(outputDir, "report.md"), `${markdown}\n`);
  console.log(markdown);
  if (critical) process.exitCode = 1;
} catch (error) {
  add("critical", "audit", "Audit crashed", error.stack || error.message);
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify({ verdict: "DO NOT DEPLOY", steps, findings }, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
